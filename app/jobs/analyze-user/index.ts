import adminSupabase from "@/lib/supabase/admin";
import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { generateObject } from "ai";
import { createHash } from "crypto";
import { FatalError } from "workflow";
import { writeDebugFile } from "../debug/helper";
import {
  ANALYZE_USER_PROMPT,
  ANALYZE_USER_SCHEMA,
  ANALYZE_USER_SYSTEM,
} from "./prompts";

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
    console.error(
      `❌ [ANALYZE USER] User not found: ${projectUserId}`,
      projectUserError,
    );
    throw new FatalError("User not found");
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
    throw new FatalError("Project user has no sessions");
  }

  if (!sessions.length) {
    console.error(
      `❌ [ANALYZE USER] Project user ${projectUserId} has no sessions`,
    );
    throw new FatalError("Project user has no sessions");
  }

  const analysisHash = createHash("sha256")
    .update(JSON.stringify(sessions.map((s) => s.id).sort()))
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
    throw new Error("Failed to update user status");
  }

  console.log(`✅ [ANALYZE USER] Successfully analyzed user ${projectUserId}`);
}
