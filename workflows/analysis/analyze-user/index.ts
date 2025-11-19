import { writeDebugFile } from "@/lib/debug/helper";
import adminSupabase from "@/lib/supabase/admin";
import { google } from "@ai-sdk/google";
import { ThinkingLevel } from "@google/genai";
import { generateObject } from "ai";
import { createHash } from "crypto";
import {
  ANALYZE_USER_PROMPT,
  ANALYZE_USER_SCHEMA,
  ANALYZE_USER_SYSTEM,
} from "./prompts";
import * as Sentry from "@sentry/nextjs";

export async function analyzeUser(projectUserId: string) {
  "use step";

  console.log(`🧠 [ANALYZE USER] Starting analysis for user ${projectUserId}`);
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
    .eq("id", projectUserId)
    .single();

  if (projectUserError || !projectUserData) {
    const error = projectUserError || new Error("User not found");
    console.error(
      `❌ [ANALYZE USER] User not found: ${projectUserId}`,
      error,
    );
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeUser" },
      extra: { projectUserId },
    });
    throw new Error("User not found");
  }

  const { sessions, ...projectUser } = projectUserData;

  console.log(`📋 [ANALYZE USER] User details:`);
  console.log(`   Name: ${projectUser.name}`);
  console.log(`   Properties: ${JSON.stringify(projectUser.properties)}`);
  console.log(`   Sessions: ${sessions.length}`);

  if (!projectUser) {
    console.error(
      `❌ [ANALYZE USER] Project user ${projectUserId} has no sessions`,
    );
    throw new Error("Project user has no sessions");
  }

  if (!sessions.length) {
    const error = new Error("Project user has no sessions");
    console.error(
      `❌ [ANALYZE USER] Project user ${projectUserId} has no sessions`,
    );
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeUser" },
      extra: {
        projectUserId,
        projectId: projectUser.project_id,
        userName: projectUser.name,
      },
    });
    throw error;
  }

  // Hash both analyzed sessions + all sessions to trigger re-analysis when:
  // 1. New sessions are discovered (all IDs change)
  // 2. Existing sessions complete analysis (analyzed IDs change)
  const analyzedSessionIds = sessions
    .filter((s) => s.status === "analyzed" && s.story)
    .map((s) => s.id)
    .sort();
  const allSessionIds = sessions.map((s) => s.id).sort();

  const analysisHash = createHash("sha256")
    .update(
      JSON.stringify({ analyzed: analyzedSessionIds, all: allSessionIds }),
    )
    .digest("hex");

  if (projectUser.analysis_hash === analysisHash) {
    // no new analysis needed
    console.log(
      `🔄 [ANALYZE USER] No new analysis needed for user ${projectUserId}`,
    );
    return { projectGroupId: projectUser.project_group_id };
  }

  // Update project user status to analyzing
  console.log(
    `🔄 [ANALYZE USER] Updating project user ${projectUserId} to analyzing status`,
  );
  const { error: startUpdateError } = await supabase
    .from("project_users")
    .update({ status: "analyzing" })
    .eq("id", projectUserId);

  if (startUpdateError) {
    console.error(
      `❌ [ANALYZE USER] Failed to update session status:`,
      startUpdateError,
    );
    Sentry.captureException(startUpdateError, {
      tags: { job: "analyzeSession", step: "analyzeUser" },
      extra: {
        projectUserId,
        projectId: projectUser.project_id,
      },
    });
    throw new Error("Failed to update session status");
  }

  // Prepare prompt for debugging
  const userPrompt = ANALYZE_USER_PROMPT({
    projectUser,
    sessions,
  });

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
      system: ANALYZE_USER_SYSTEM,
      schema: ANALYZE_USER_SCHEMA,
      prompt: userPrompt,
    });
    object = result.object;
  } catch (error) {
    console.error(`❌ [ANALYZE USER] AI analysis failed:`, error);
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeUser/ai" },
      extra: {
        projectUserId,
        projectId: projectUser.project_id,
        sessionsCount: sessions.length,
      },
    });
    throw error;
  }

  console.log(`🧠 [ANALYZE USER] Analysis complete`);

  // Write debug file
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await writeDebugFile(`debug-${timestamp}-analyze-user-${projectUserId}.txt`, {
    timestamp: new Date().toISOString(),
    job: "analyze-user",
    id: projectUserId,
    systemPrompt: ANALYZE_USER_SYSTEM,
    userPrompt: userPrompt,
    modelResponse: JSON.stringify(object, null, 2),
  });

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
    .eq("id", projectUserId);

  if (finishUpdateError) {
    console.error(
      `❌ [ANALYZE USER] Failed to update user status:`,
      finishUpdateError,
    );
    Sentry.captureException(finishUpdateError, {
      tags: { job: "analyzeSession", step: "analyzeUser/updateStatus" },
      extra: {
        projectUserId,
        projectId: projectUser.project_id,
        analysisData: object,
      },
    });
    throw new Error("Failed to update user status");
  }

  console.log(`✅ [ANALYZE USER] Successfully analyzed user ${projectUserId}`);
}
