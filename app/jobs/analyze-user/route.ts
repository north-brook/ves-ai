import { NextRequest, NextResponse } from "next/server";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import { generateObject } from "ai";
import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import {
  ANALYZE_USER_PROMPT,
  ANALYZE_USER_SCHEMA,
  ANALYZE_USER_SYSTEM,
} from "./prompts";
import { createHash } from "crypto";
import { AnalyzeGroupJobRequest } from "../analyze-group/route";
import { writeDebugFile } from "../debug/helper";

export type AnalyzeUserJobRequest = {
  project_user_id: string;
  force?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("🚫 Unauthorized analyze user job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AnalyzeUserJobRequest = await request.json();
    const { project_user_id, force } = body;

    if (!project_user_id) {
      console.error("❌ [ANALYZE USER] Missing project_user_id");
      return NextResponse.json(
        { error: "Missing project_user_id" },
        { status: 400 },
      );
    }

    console.log(
      `🧠 [ANALYZE USER] Starting analysis for user ${project_user_id}`,
    );
    const supabase = adminSupabase();

    // Fetch user details with sessions and their related data
    const { data: projectUserData, error: projectUserError } = await supabase
      .from("project_users")
      .select(
        `
        *,
        sessions(
          *,
          project_group:project_groups(*),
          session_issues(issue:issues(*))
        )
      `,
      )
      .eq("id", project_user_id)
      .single();

    if (projectUserError || !projectUserData) {
      console.error(
        `❌ [ANALYZE USER] User not found: ${project_user_id}`,
        projectUserError,
      );
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { sessions, ...projectUser } = projectUserData;

    console.log(`📋 [ANALYZE USER] User details:`);
    console.log(`   Name: ${projectUser.name}`);
    console.log(`   Properties: ${JSON.stringify(projectUser.properties)}`);
    console.log(`   Sessions: ${sessions.length}`);

    if (!projectUser) {
      console.error(
        `❌ [ANALYZE USER] Project user ${project_user_id} has no sessions`,
      );
      return NextResponse.json(
        {
          error: "Project user has no sessions",
        },
        { status: 400 },
      );
    }

    if (!sessions.length) {
      console.error(
        `❌ [ANALYZE USER] Project user ${project_user_id} has no sessions`,
      );
      return NextResponse.json(
        {
          error: "Project user has no sessions",
        },
        { status: 400 },
      );
    }

    const analysisHash = createHash("sha256")
      .update(JSON.stringify(sessions.map((s) => s.id).sort()))
      .digest("hex");

    if (projectUser.analysis_hash === analysisHash && !force) {
      // no new analysis needed
      console.log(
        `🔄 [ANALYZE USER] No new analysis needed for user ${project_user_id}`,
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Update project user status to analyzing
    console.log(
      `🔄 [ANALYZE USER] Updating project user ${project_user_id} to analyzing status`,
    );
    const { error: startUpdateError } = await supabase
      .from("project_users")
      .update({ status: "analyzing" })
      .eq("id", project_user_id);

    if (startUpdateError) {
      console.error(
        `❌ [ANALYZE USER] Failed to update session status:`,
        startUpdateError,
      );
      throw new Error("Failed to update session status");
    }

    // Prepare prompt for debugging
    const userPrompt = ANALYZE_USER_PROMPT({
      projectUser,
      sessions,
    });

    const { object } = await generateObject({
      model: google("gemini-2.5-pro"),
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 32768,
          },
        } satisfies GoogleGenerativeAIProviderOptions,
      },
      system: ANALYZE_USER_SYSTEM,
      schema: ANALYZE_USER_SCHEMA,
      prompt: userPrompt,
    });

    console.log(`🧠 [ANALYZE USER] Analysis complete`);

    // Write debug file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await writeDebugFile(
      `debug-${timestamp}-analyze-user-${project_user_id}.txt`,
      {
        timestamp: new Date().toISOString(),
        job: "analyze-user",
        id: project_user_id,
        systemPrompt: ANALYZE_USER_SYSTEM,
        userPrompt: userPrompt,
        modelResponse: JSON.stringify(object, null, 2),
      },
    );

    const { error: finishUpdateError } = await supabase
      .from("project_users")
      .update({
        status: "analyzed",
        analyzed_at: new Date().toISOString(),
        story: object.story,
        health: object.health,
        score: object.score,
        analysis_hash: analysisHash,
      })
      .eq("id", project_user_id);

    if (finishUpdateError) {
      console.error(
        `❌ [ANALYZE USER] Failed to update user status:`,
        finishUpdateError,
      );
      throw new Error("Failed to update user status");
    }

    console.log(
      `✅ [ANALYZE USER] Successfully analyzed user ${project_user_id}`,
    );

    // Trigger analyze group job
    if (projectUser.project_group_id) {
      console.log(
        `🔄 [ANALYZE USER] Triggering analyze group job for user ${project_user_id}`,
      );
      fetch(`${process.env.NEXT_PUBLIC_URL}/jobs/analyze-group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          project_group_id: projectUser.project_group_id,
          force,
        } as AnalyzeGroupJobRequest),
      }).catch((error) => {
        console.error(
          `❌ [ANALYZE USER] Failed to trigger analyze group job:`,
          error,
        );
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`💥 [ANALYZE USER] Job failed:`, error);

    // Try to update session status to failed
    const body = await request.json().catch(() => ({}));
    try {
      if (body?.project_user_id) {
        const supabase = adminSupabase();
        await supabase
          .from("project_users")
          .update({ status: "failed" })
          .eq("id", body.project_user_id);
        console.log(
          `⚠️ [ANALYZE USER] Updated project user ${body.project_user_id} to failed status`,
        );
      }
    } catch (updateError) {
      console.error(
        `❌ [ANALYZE USER] Failed to update project user to failed status:`,
        updateError,
      );
    }

    Sentry.captureException(error, {
      tags: { job: "analyzeUser" },
      extra: { projectUserId: body?.project_user_id },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
