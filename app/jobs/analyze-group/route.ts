import { NextRequest, NextResponse } from "next/server";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import { generateObject } from "ai";
import { openai, OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import {
  ANALYZE_GROUP_PROMPT,
  ANALYZE_GROUP_SCHEMA,
  ANALYZE_GROUP_SYSTEM,
} from "./prompts";
import { createHash } from "crypto";
import { writeDebugFile } from "../debug/helper";

export type AnalyzeGroupJobRequest = {
  project_group_id: string;
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

    const body: AnalyzeGroupJobRequest = await request.json();
    const { project_group_id, force } = body;

    if (!project_group_id) {
      console.error("❌ [ANALYZE GROUP] Missing project_group_id");
      return NextResponse.json(
        { error: "Missing project_group_id" },
        { status: 400 },
      );
    }

    console.log(
      `🧠 [ANALYZE GROUP] Starting analysis for group ${project_group_id}`,
    );
    const supabase = adminSupabase();

    // Fetch group details with users and their sessions
    const { data: projectGroupData, error: projectGroupError } = await supabase
      .from("project_groups")
      .select(
        `
        *,
        projectUsers:project_users(
          *,
          sessions(
            *,
            session_pages(page:pages(*)),
            session_issues(issue:issues(*))
          )
        )
      `,
      )
      .eq("id", project_group_id)
      .single();

    if (projectGroupError || !projectGroupData) {
      console.error(
        `❌ [ANALYZE GROUP] Group not found: ${project_group_id}`,
        projectGroupError,
      );
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const { projectUsers, ...projectGroup } = projectGroupData;

    console.log(`📋 [ANALYZE GROUP] Group details:`);
    console.log(`   Name: ${projectGroup.name}`);
    console.log(`   Properties: ${JSON.stringify(projectGroup.properties)}`);
    console.log(`   Users: ${projectUsers.length}`);

    if (!projectUsers.length) {
      console.error(
        `❌ [ANALYZE GROUP] Project group ${project_group_id} has no users`,
      );
      return NextResponse.json(
        {
          error: "Project group has no users",
        },
        { status: 400 },
      );
    }

    if (!projectUsers.length) {
      console.error(
        `❌ [ANALYZE GROUP] Project group ${project_group_id} has no users`,
      );
      return NextResponse.json(
        {
          error: "Project group has no users",
        },
        { status: 400 },
      );
    }

    const analysisHash = createHash("sha256")
      .update(JSON.stringify(projectUsers.map((u) => u.analysis_hash).sort()))
      .digest("hex");

    if (projectGroup.analysis_hash === analysisHash && !force) {
      // no new analysis needed
      console.log(
        `🔄 [ANALYZE GROUP] No new analysis needed for group ${project_group_id}`,
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Update project user status to analyzing
    console.log(
      `🔄 [ANALYZE GROUP] Updating project group ${project_group_id} to analyzing status`,
    );
    const { error: startUpdateError } = await supabase
      .from("project_groups")
      .update({ status: "analyzing" })
      .eq("id", project_group_id);

    if (startUpdateError) {
      console.error(
        `❌ [ANALYZE GROUP] Failed to update group status:`,
        startUpdateError,
      );
      throw new Error("Failed to update session status");
    }

    // Prepare prompt for debugging
    const groupPrompt = ANALYZE_GROUP_PROMPT({
      projectGroup,
      projectUsers,
    });

    const { object } = await generateObject({
      model: openai.responses("gpt-5"),
      providerOptions: {
        openai: {
          reasoningEffort: "high",
          strictJsonSchema: true,
        } satisfies OpenAIResponsesProviderOptions,
      },
      system: ANALYZE_GROUP_SYSTEM,
      schema: ANALYZE_GROUP_SCHEMA,
      prompt: groupPrompt,
    });

    console.log(`🧠 [ANALYZE GROUP] Analysis complete`);

    // Write debug file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await writeDebugFile(
      `debug-${timestamp}-analyze-group-${project_group_id}.txt`,
      {
        timestamp: new Date().toISOString(),
        job: "analyze-group",
        id: project_group_id,
        systemPrompt: ANALYZE_GROUP_SYSTEM,
        userPrompt: groupPrompt,
        modelResponse: JSON.stringify(object, null, 2),
      },
    );

    const { error: finishUpdateError } = await supabase
      .from("project_groups")
      .update({
        status: "analyzed",
        analyzed_at: new Date().toISOString(),
        story: object.story,
        health: object.health,
        score: object.score,
        analysis_hash: analysisHash,
      })
      .eq("id", project_group_id);

    if (finishUpdateError) {
      console.error(
        `❌ [ANALYZE GROUP] Failed to update group status:`,
        finishUpdateError,
      );
      throw new Error("Failed to update user status");
    }

    console.log(
      `✅ [ANALYZE GROUP] Successfully analyzed group ${project_group_id}`,
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`💥 [ANALYZE GROUP] Job failed:`, error);

    // Try to update session status to failed
    const body = await request.json().catch(() => ({}));
    try {
      if (body?.project_group_id) {
        const supabase = adminSupabase();
        await supabase
          .from("project_groups")
          .update({ status: "failed" })
          .eq("id", body.project_group_id);
        console.log(
          `⚠️ [ANALYZE GROUP] Updated project group ${body.project_group_id} to failed status`,
        );
      }
    } catch (updateError) {
      console.error(
        `❌ [ANALYZE GROUP] Failed to update project group to failed status:`,
        updateError,
      );
    }

    Sentry.captureException(error, {
      tags: { job: "analyzeGroup" },
      extra: { projectGroupId: body?.project_group_id },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
