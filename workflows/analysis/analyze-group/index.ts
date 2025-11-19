import { writeDebugFile } from "@/lib/debug/helper";
import adminSupabase from "@/lib/supabase/admin";
import { google } from "@ai-sdk/google";
import { ThinkingLevel } from "@google/genai";
import { generateObject } from "ai";
import { createHash } from "crypto";
import {
  ANALYZE_GROUP_PROMPT,
  ANALYZE_GROUP_SCHEMA,
  ANALYZE_GROUP_SYSTEM,
} from "./prompts";
import * as Sentry from "@sentry/nextjs";

export async function analyzeGroup(projectGroupId: string) {
  "use step";

  console.log(
    `🧠 [ANALYZE GROUP] Starting analysis for group ${projectGroupId}`,
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
            session_issues(issue:issues(*))
          )
        )
      `,
    )
    .eq("id", projectGroupId)
    .single();

  if (projectGroupError || !projectGroupData) {
    const error = projectGroupError || new Error("Group not found");
    console.error(
      `❌ [ANALYZE GROUP] Group not found: ${projectGroupId}`,
      error,
    );
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeGroup" },
      extra: { projectGroupId },
    });
    throw new Error("Group not found");
  }

  const { projectUsers, ...projectGroup } = projectGroupData;

  console.log(`📋 [ANALYZE GROUP] Group details:`);
  console.log(`   Name: ${projectGroup.name}`);
  console.log(`   Properties: ${JSON.stringify(projectGroup.properties)}`);
  console.log(`   Users: ${projectUsers.length}`);

  if (!projectUsers.length) {
    const error = new Error("Project group has no users");
    console.error(
      `❌ [ANALYZE GROUP] Project group ${projectGroupId} has no users`,
    );
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeGroup" },
      extra: {
        projectGroupId,
        projectId: projectGroup.project_id,
        groupName: projectGroup.name,
      },
    });
    throw error;
  }

  // Hash both analyzed sessions + all sessions across all users to trigger re-analysis when:
  // 1. New sessions are discovered for any user (all IDs change)
  // 2. Existing sessions complete analysis (analyzed IDs change)
  const allSessions = projectUsers.flatMap((u) => u.sessions || []);
  const analyzedSessionIds = allSessions
    .filter((s) => s.status === "analyzed" && s.story)
    .map((s) => s.id)
    .sort();
  const allSessionIds = allSessions.map((s) => s.id).sort();

  const analysisHash = createHash("sha256")
    .update(
      JSON.stringify({ analyzed: analyzedSessionIds, all: allSessionIds }),
    )
    .digest("hex");

  if (projectGroup.analysis_hash === analysisHash) {
    // no new analysis needed
    console.log(
      `🔄 [ANALYZE GROUP] No new analysis needed for group ${projectGroupId}`,
    );
    return;
  }

  // Update project user status to analyzing
  console.log(
    `🔄 [ANALYZE GROUP] Updating project group ${projectGroupId} to analyzing status`,
  );
  const { error: startUpdateError } = await supabase
    .from("project_groups")
    .update({ status: "analyzing" })
    .eq("id", projectGroupId);

  if (startUpdateError) {
    console.error(
      `❌ [ANALYZE GROUP] Failed to update group status:`,
      startUpdateError,
    );
    Sentry.captureException(startUpdateError, {
      tags: { job: "analyzeSession", step: "analyzeGroup" },
      extra: {
        projectGroupId,
        projectId: projectGroup.project_id,
      },
    });
    throw new Error("Failed to update session status");
  }

  // Prepare prompt for debugging
  const groupPrompt = ANALYZE_GROUP_PROMPT({
    projectGroup,
    projectUsers,
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
      system: ANALYZE_GROUP_SYSTEM,
      schema: ANALYZE_GROUP_SCHEMA,
      prompt: groupPrompt,
    });
    object = result.object;
  } catch (error) {
    console.error(`❌ [ANALYZE GROUP] AI analysis failed:`, error);
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeGroup/ai" },
      extra: {
        projectGroupId,
        projectId: projectGroup.project_id,
        usersCount: projectUsers.length,
      },
    });
    throw error;
  }

  console.log(`🧠 [ANALYZE GROUP] Analysis complete`);

  // Write debug file
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await writeDebugFile(
    `debug-${timestamp}-analyze-group-${projectGroupId}.txt`,
    {
      timestamp: new Date().toISOString(),
      job: "analyze-group",
      id: projectGroupId,
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
    .eq("id", projectGroupId);

  if (finishUpdateError) {
    console.error(
      `❌ [ANALYZE GROUP] Failed to update group status:`,
      finishUpdateError,
    );
    Sentry.captureException(finishUpdateError, {
      tags: { job: "analyzeSession", step: "analyzeGroup/updateStatus" },
      extra: {
        projectGroupId,
        projectId: projectGroup.project_id,
        analysisData: object,
      },
    });
    throw new Error("Failed to update user status");
  }

  console.log(
    `✅ [ANALYZE GROUP] Successfully analyzed group ${projectGroupId}`,
  );
}
