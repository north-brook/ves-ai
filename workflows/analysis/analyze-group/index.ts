import { writeDebugFile } from "@/lib/debug/helper";
import adminSupabase from "@/lib/supabase/admin";
import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { generateObject } from "ai";
import { createHash } from "crypto";
import { FatalError } from "workflow";
import {
  ANALYZE_GROUP_PROMPT,
  ANALYZE_GROUP_SCHEMA,
  ANALYZE_GROUP_SYSTEM,
} from "./prompts";

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
    console.error(
      `❌ [ANALYZE GROUP] Group not found: ${projectGroupId}`,
      projectGroupError,
    );
    throw new FatalError("Group not found");
  }

  const { projectUsers, ...projectGroup } = projectGroupData;

  console.log(`📋 [ANALYZE GROUP] Group details:`);
  console.log(`   Name: ${projectGroup.name}`);
  console.log(`   Properties: ${JSON.stringify(projectGroup.properties)}`);
  console.log(`   Users: ${projectUsers.length}`);

  if (!projectUsers.length) {
    console.error(
      `❌ [ANALYZE GROUP] Project group ${projectGroupId} has no users`,
    );
    throw new FatalError("Project group has no users");
  }

  if (!projectUsers.length) {
    console.error(
      `❌ [ANALYZE GROUP] Project group ${projectGroupId} has no users`,
    );
    throw new FatalError("Project group has no users");
  }

  const analysisHash = createHash("sha256")
    .update(JSON.stringify(projectUsers.map((u) => u.analysis_hash).sort()))
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
    throw new Error("Failed to update session status");
  }

  // Prepare prompt for debugging
  const groupPrompt = ANALYZE_GROUP_PROMPT({
    projectGroup,
    projectUsers,
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
    system: ANALYZE_GROUP_SYSTEM,
    schema: ANALYZE_GROUP_SCHEMA,
    prompt: groupPrompt,
  });

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
    throw new Error("Failed to update user status");
  }

  console.log(
    `✅ [ANALYZE GROUP] Successfully analyzed group ${projectGroupId}`,
  );
}
