import { NextRequest, NextResponse } from "next/server";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import { generateObject } from "ai";
import { openai, OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import {
  ANALYZE_ISSUE_PROMPT,
  ANALYZE_ISSUE_SCHEMA,
  ANALYZE_ISSUE_SYSTEM,
} from "./prompts";
import { createHash } from "crypto";
import { writeDebugFile } from "../debug/helper";

export type AnalyzeIssueJobRequest = {
  issue_id: string;
  force?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("🚫 Unauthorized analyze issue job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AnalyzeIssueJobRequest = await request.json();
    const { issue_id, force } = body;

    if (!issue_id) {
      console.error("❌ [ANALYZE ISSUE] Missing issue_id");
      return NextResponse.json(
        { error: "Missing issue_id" },
        { status: 400 },
      );
    }

    console.log(
      `🧠 [ANALYZE ISSUE] Starting analysis for issue ${issue_id}`,
    );
    const supabase = adminSupabase();

    // Fetch issue details with all linked session_issues and their sessions
    const { data: issueData, error: issueError } = await supabase
      .from("issues")
      .select(
        `
        *,
        session_issues(
          *,
          session:sessions(*)
        )
      `,
      )
      .eq("id", issue_id)
      .single();

    if (issueError || !issueData) {
      console.error(
        `❌ [ANALYZE ISSUE] Issue not found: ${issue_id}`,
        issueError,
      );
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    const { session_issues, ...issue } = issueData;

    console.log(`📋 [ANALYZE ISSUE] Issue details:`);
    console.log(`   ID: ${issue.id}`);
    console.log(`   Current Name: ${issue.name || "Not set"}`);
    console.log(`   Status: ${issue.status}`);
    console.log(`   Session Occurrences: ${session_issues.length}`);

    if (!session_issues || session_issues.length === 0) {
      console.error(
        `❌ [ANALYZE ISSUE] Issue ${issue_id} has no linked sessions`,
      );
      return NextResponse.json(
        {
          error: "Issue has no linked sessions",
        },
        { status: 400 },
      );
    }

    // Calculate hash based on session_issue IDs to detect changes
    const analysisHash = createHash("sha256")
      .update(JSON.stringify(session_issues.map((si: any) => si.session_id).sort()))
      .digest("hex");

    if (issue.analysis_hash === analysisHash && !force) {
      // No new analysis needed
      console.log(
        `🔄 [ANALYZE ISSUE] No new analysis needed for issue ${issue_id}`,
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Update issue status to analyzing
    console.log(
      `🔄 [ANALYZE ISSUE] Updating issue ${issue_id} to analyzing status`,
    );
    const { error: startUpdateError } = await supabase
      .from("issues")
      .update({ status: "analyzing" })
      .eq("id", issue_id);

    if (startUpdateError) {
      console.error(
        `❌ [ANALYZE ISSUE] Failed to update issue status:`,
        startUpdateError,
      );
      throw new Error("Failed to update issue status");
    }

    // Prepare prompt for AI analysis
    const userPrompt = ANALYZE_ISSUE_PROMPT({
      issue,
      sessionIssues: session_issues.map((si: any) => ({
        ...si,
        session: si.session,
      })),
    });

    console.log(
      `🤖 [ANALYZE ISSUE] Generating analysis with AI...`,
    );

    const { object } = await generateObject({
      model: openai.responses("gpt-5"),
      providerOptions: {
        openai: {
          reasoningEffort: "high",
          strictJsonSchema: true,
        } satisfies OpenAIResponsesProviderOptions,
      },
      system: ANALYZE_ISSUE_SYSTEM,
      schema: ANALYZE_ISSUE_SCHEMA,
      prompt: userPrompt,
    });

    console.log(`🧠 [ANALYZE ISSUE] Analysis complete`);
    console.log(`   Generated Name: ${object.name}`);
    console.log(`   Type: ${object.type}`);
    console.log(`   Severity: ${object.severity}`);
    console.log(`   Priority: ${object.priority}`);
    console.log(`   Confidence: ${object.confidence}`);

    // Write debug file for analysis review
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await writeDebugFile(
      `debug-${timestamp}-analyze-issue-${issue_id}.txt`,
      {
        timestamp: new Date().toISOString(),
        job: "analyze-issue",
        id: issue_id,
        systemPrompt: ANALYZE_ISSUE_SYSTEM,
        userPrompt: userPrompt,
        modelResponse: JSON.stringify(object, null, 2),
      },
    );

    // Update issue with analysis results
    const { error: finishUpdateError } = await supabase
      .from("issues")
      .update({
        status: "analyzed",
        analyzed_at: new Date().toISOString(),
        name: object.name,
        story: object.story,
        type: object.type,
        severity: object.severity,
        priority: object.priority,
        confidence: object.confidence,
        analysis_hash: analysisHash,
      })
      .eq("id", issue_id);

    if (finishUpdateError) {
      console.error(
        `❌ [ANALYZE ISSUE] Failed to update issue with analysis:`,
        finishUpdateError,
      );
      throw new Error("Failed to update issue with analysis");
    }

    console.log(
      `✅ [ANALYZE ISSUE] Successfully analyzed issue ${issue_id}`,
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`💥 [ANALYZE ISSUE] Job failed:`, error);

    // Try to update issue status to failed
    const body = await request.json().catch(() => ({}));
    try {
      if (body?.issue_id) {
        const supabase = adminSupabase();
        await supabase
          .from("issues")
          .update({ status: "failed" })
          .eq("id", body.issue_id);
        console.log(
          `⚠️ [ANALYZE ISSUE] Updated issue ${body.issue_id} to failed status`,
        );
      }
    } catch (updateError) {
      console.error(
        `❌ [ANALYZE ISSUE] Failed to update issue to failed status:`,
        updateError,
      );
    }

    Sentry.captureException(error, {
      tags: { job: "analyzeIssue" },
      extra: { issueId: body?.issue_id },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}