import type { ProcessRequest } from "@/cloud/src/types";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

export type ProcessJobRequest = {
  session_id: string;
};

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("🚫 Unauthorized process job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ProcessJobRequest = await request.json();
    const { session_id } = body;

    if (!session_id) {
      console.error("❌ [PROCESS] Missing session_id");
      throw new Error("Missing session_id");
    }

    console.log(`🎬 [PROCESS] Starting processing for session ${session_id}`);
    const supabase = adminSupabase();

    // Fetch session with source details
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select(
        "id,external_id,status,active_duration,project_id,source_id,source:sources(id,source_host,source_key,source_project,type),project:projects(slug)",
      )
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      console.error(
        `❌ [PROCESS] Session not found: ${session_id}`,
        sessionError,
      );
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    console.log(`📋 [PROCESS] Session details:`);
    console.log(`   Recording: ${session.external_id}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Source: ${session.source_id}`);

    // Check if already processing or processed
    if (session.status !== "pending") {
      console.warn(`⚠️ [PROCESS] Session ${session_id} is already processing`);
      return NextResponse.json(
        { error: "Session is already processing" },
        { status: 200 },
      );
    }

    if (!session.active_duration) {
      console.error(
        `❌ [PROCESS] Session ${session_id} missing active_duration`,
      );
      throw new Error("Session missing active_duration");
    }

    // Update session status to processing
    console.log(
      `🔄 [PROCESS] Updating session ${session_id} to processing status`,
    );
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ status: "processing", processed_at: new Date().toISOString() })
      .eq("id", session_id);

    if (updateError) {
      console.error(
        `❌ [PROCESS] Failed to update session status:`,
        updateError,
      );
      throw updateError;
    }

    // Prepare cloud service request
    const cloudRequest: ProcessRequest = {
      project_id: session.project_id,
      session_id: session.id,
      source_type: "posthog",
      source_host: session.source.source_host!,
      source_key: session.source.source_key!,
      source_project: session.source.source_project!,
      external_id: session.external_id,
      active_duration: session.active_duration,
      callback: `${process.env.NEXT_PUBLIC_URL}/jobs/process-replay/callback`,
    };

    console.log(`☁️ [PROCESS] Sending request to cloud service`);
    console.log(`   Cloud URL: ${process.env.CLOUD_URL}/render`);
    console.log(`   Recording: ${cloudRequest.external_id}`);
    console.log(
      `   File path: ${cloudRequest.project_id}/${cloudRequest.session_id}.webm`,
    );

    // Call cloud rendering service
    console.log(`🚀 [PROCESS] Triggering cloud service`);
    const cloudResponse = await fetch(`${process.env.CLOUD_URL}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cloudRequest),
      // Add timeout to detect hung requests
      signal: AbortSignal.timeout(10000), // 10s timeout for acceptance
    });

    if (!cloudResponse.ok) {
      const errorText = await cloudResponse.text().catch(() => "No error details");
      console.error(
        `❌ [PROCESS] Cloud service rejected request:`,
        cloudResponse.status,
        errorText,
      );

      // Revert session status back to pending for retry
      await supabase
        .from("sessions")
        .update({ status: "pending", processed_at: null })
        .eq("id", session_id);

      throw new Error(
        `Cloud service error: ${cloudResponse.status} - ${errorText}`,
      );
    }

    const cloudResult = await cloudResponse.json();
    console.log(`✅ [PROCESS] Cloud service accepted job:`, cloudResult);

    return NextResponse.json({
      success: true,
      session_id,
      message: "Processing started successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`💥 [PROCESS] Job failed:`, error);

    // Note: Session status should already be updated to 'failed' in the specific error handlers above
    // This catch block is for unexpected errors

    Sentry.captureException(error, {
      tags: { job: "process" },
      extra: {
        // We can't re-read the request body, but we might have session_id from earlier in the function
        errorContext: "processJobFailed",
      },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
