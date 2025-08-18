import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import type { RenderRequest } from "@/cloud/src/types";

type ProcessRequest = {
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

    const body: ProcessRequest = await request.json();
    const { session_id } = body;

    if (!session_id) {
      console.error("❌ [PROCESS] Missing session_id");
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 },
      );
    }

    console.log(`🎬 [PROCESS] Starting processing for session ${session_id}`);
    const supabase = adminSupabase();

    // Fetch session with source details and embed_url
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select(
        "id,recording_id,status,embed_url,project_id,source_id,source:sources(id,source_host,source_key,source_project,type),project:projects(slug)",
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
    console.log(`   Recording: ${session.recording_id}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Source: ${session.source_id}`);
    console.log(`   Embed URL: ${session.embed_url ? "Present" : "Missing"}`);

    // Check if already processing or processed
    if (session.status !== "pending") {
      console.warn(
        `⚠️ [PROCESS] Session ${session_id} is not pending (status: ${session.status})`,
      );
      return NextResponse.json(
        {
          error: `Session is not pending (status: ${session.status})`,
        },
        { status: 400 },
      );
    }

    // Check if embed_url exists
    if (!session.embed_url) {
      console.error(`❌ [PROCESS] Session ${session_id} missing embed_url`);
      return NextResponse.json(
        {
          error: `Session missing embed_url`,
        },
        { status: 400 },
      );
    }

    // Update session status to processing
    console.log(
      `🔄 [PROCESS] Updating session ${session_id} to processing status`,
    );
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ status: "processing" })
      .eq("id", session_id);

    if (updateError) {
      console.error(
        `❌ [PROCESS] Failed to update session status:`,
        updateError,
      );
      throw updateError;
    }

    // Prepare cloud service request
    const cloudRequest: RenderRequest = {
      source_type: "posthog",
      source_host: session.source.source_host!,
      source_key: session.source.source_key!,
      source_project: session.source.source_project!,
      recording_id: session.recording_id,
      embed_url: session.embed_url, // Pass the embed URL from the session
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabase_storage_url: process.env.NEXT_PUBLIC_SUPABASE_URL!.replaceAll(
        "supabase.co",
        "storage.supabase.co",
      ),
      supabase_service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      supabase_bucket: "sessions",
      supabase_file_path: `${session.project_id}/${session.id}.webm`,
      callback: `${process.env.NEXT_PUBLIC_URL}/jobs/process/callback`,
    };

    console.log(`☁️ [PROCESS] Sending request to cloud service`);
    console.log(`   Cloud URL: ${process.env.CLOUD_URL}/render`);
    console.log(`   Recording: ${cloudRequest.recording_id}`);
    console.log(`   File path: ${cloudRequest.supabase_file_path}`);

    // Call cloud rendering service and verify it accepts the job
    console.log(`🚀 [PROCESS] Triggering cloud service`);
    let cloudResponse: Response;
    try {
      cloudResponse = await fetch(`${process.env.CLOUD_URL}/render`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cloudRequest),
      });
    } catch (fetchError) {
      console.error(
        `❌ [PROCESS] Failed to connect to cloud service:`,
        fetchError instanceof Error ? fetchError.message : fetchError,
      );

      // Update session status back to failed
      await supabase
        .from("sessions")
        .update({ status: "failed" })
        .eq("id", session_id);

      throw new Error(
        `Failed to connect to cloud service: ${fetchError instanceof Error ? fetchError.message : fetchError}`,
      );
    }

    // Check if cloud service accepted the job
    if (!cloudResponse.ok) {
      const errorText = await cloudResponse.text().catch(() => "Unknown error");
      console.error(
        `❌ [PROCESS] Cloud service rejected the job:`,
        cloudResponse.status,
        errorText,
      );

      // Update session status back to failed
      await supabase
        .from("sessions")
        .update({ status: "failed" })
        .eq("id", session_id);

      throw new Error(`Cloud service failed to accept job: ${errorText}`);
    }

    const cloudResult = await cloudResponse.json().catch(() => null);
    console.log(
      `✅ [PROCESS] Cloud service accepted job:`,
      cloudResult?.message || "Processing started",
    );

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
        error_context: "process_job_failed",
      },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
