import { writeDebugFile } from "@/lib/debug/helper";
import adminSupabase from "@/lib/supabase/admin";
import { google } from "@ai-sdk/google";
import { ThinkingLevel } from "@google/genai";
import { generateObject } from "ai";
import { createHash } from "crypto";
import { NextResponse } from "next/server";
import {
  ANALYZE_ISSUE_PROMPT,
  ANALYZE_ISSUE_SCHEMA,
  ANALYZE_ISSUE_SYSTEM,
} from "./prompts";
import * as Sentry from "@sentry/nextjs";

export type AnalyzeIssueJobRequest = {
  issue_id: string;
  force?: boolean;
};

export async function analyzeIssue(issueId: string) {
  "use step";

  console.log(`🧠 [ANALYZE ISSUE] Starting analysis for issue ${issueId}`);
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
    .eq("id", issueId)
    .single();

  if (issueError || !issueData) {
    const error = issueError || new Error("Issue not found");
    console.error(`❌ [ANALYZE ISSUE] Issue not found: ${issueId}`, error);
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeIssue" },
      extra: { issueId },
    });
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  const { session_issues, ...issue } = issueData;

  console.log(`📋 [ANALYZE ISSUE] Issue details:`);
  console.log(`   ID: ${issue.id}`);
  console.log(`   Current Name: ${issue.name || "Not set"}`);
  console.log(`   Status: ${issue.status}`);
  console.log(`   Session Occurrences: ${session_issues.length}`);

  if (!session_issues || session_issues.length === 0) {
    const error = new Error("Issue has no linked sessions");
    console.error(`❌ [ANALYZE ISSUE] Issue ${issueId} has no linked sessions`);
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeIssue" },
      extra: {
        issueId,
        projectId: issue.project_id,
        issueName: issue.name,
      },
    });
    return NextResponse.json(
      {
        error: "Issue has no linked sessions",
      },
      { status: 400 },
    );
  }

  // Calculate hash based on session_issue IDs to detect changes
  const analysisHash = createHash("sha256")
    .update(JSON.stringify(session_issues.map((si) => si.session_id).sort()))
    .digest("hex");

  if (issue.analysis_hash === analysisHash) {
    // No new analysis needed
    console.log(
      `🔄 [ANALYZE ISSUE] No new analysis needed for issue ${issueId}`,
    );
    return;
  }

  // Update issue status to analyzing
  console.log(
    `🔄 [ANALYZE ISSUE] Updating issue ${issueId} to analyzing status`,
  );
  const { error: startUpdateError } = await supabase
    .from("issues")
    .update({ status: "analyzing" })
    .eq("id", issueId);

  if (startUpdateError) {
    console.error(
      `❌ [ANALYZE ISSUE] Failed to update issue status:`,
      startUpdateError,
    );
    Sentry.captureException(startUpdateError, {
      tags: { job: "analyzeSession", step: "analyzeIssue" },
      extra: {
        issueId,
        projectId: issue.project_id,
      },
    });
    throw new Error("Failed to update issue status");
  }

  // Prepare prompt for AI analysis
  const userPrompt = ANALYZE_ISSUE_PROMPT({
    issue,
    sessionIssues: session_issues.map((si) => ({
      ...si,
      session: si.session,
    })),
  });

  console.log(`🤖 [ANALYZE ISSUE] Generating analysis with AI...`);

  let object;
  try {
    const result = await generateObject({
      model: google("gemini-3-pro-preview"),
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      },
      system: ANALYZE_ISSUE_SYSTEM,
      schema: ANALYZE_ISSUE_SCHEMA,
      prompt: userPrompt,
    });
    object = result.object;
  } catch (error) {
    console.error(`❌ [ANALYZE ISSUE] AI analysis failed:`, error);
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeIssue/ai" },
      extra: {
        issueId,
        projectId: issue.project_id,
        sessionIssuesCount: session_issues.length,
      },
    });
    throw error;
  }

  console.log(`🧠 [ANALYZE ISSUE] Analysis complete`);
  console.log(`   Generated Name: ${object.name}`);
  console.log(`   Type: ${object.type}`);
  console.log(`   Severity: ${object.severity}`);
  console.log(`   Priority: ${object.priority}`);
  console.log(`   Confidence: ${object.confidence}`);

  // Write debug file for analysis review
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await writeDebugFile(`debug-${timestamp}-analyze-issue-${issueId}.txt`, {
    timestamp: new Date().toISOString(),
    job: "analyze-issue",
    id: issueId,
    systemPrompt: ANALYZE_ISSUE_SYSTEM,
    userPrompt: userPrompt,
    modelResponse: JSON.stringify(object, null, 2),
  });

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
    .eq("id", issueId);

  if (finishUpdateError) {
    console.error(
      `❌ [ANALYZE ISSUE] Failed to update issue with analysis:`,
      finishUpdateError,
    );
    Sentry.captureException(finishUpdateError, {
      tags: { job: "analyzeSession", step: "analyzeIssue/updateAnalysis" },
      extra: {
        issueId,
        projectId: issue.project_id,
        analysisData: object,
      },
    });
    throw new Error("Failed to update issue with analysis");
  }

  console.log(`✅ [ANALYZE ISSUE] Successfully analyzed issue ${issueId}`);
}
