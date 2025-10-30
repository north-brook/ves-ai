import adminSupabase from "@/lib/supabase/admin";
import { createHook, FatalError, sleep } from "workflow";
import { analyzeGroup } from "./analyze-group";
import { analyzeIssue } from "./analyze-issue";
import { analyzeSession } from "./analyze-session";
import { analyzeUser } from "./analyze-user";
import { reconcileIssues } from "./reconcile-issues";
import { replay } from "./replay";
import next from "./sync/next";

export async function run(sessionId: string) {
  "use workflow";

  const supabase = adminSupabase();

  // get the session
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("project_id, project_user_id, project_group_id")
    .eq("id", sessionId)
    .single();
  if (sessionError) {
    console.error("❌ [RUN] Failed to fetch session:", sessionError);
    throw new FatalError("Failed to fetch session");
  }

  // process replay using the cloud service with a timeout
  const replayHook = createHook<{ success: boolean }>();
  await replay(sessionId);
  Promise.race([
    replayHook,
    async () => {
      sleep("6 hours");
      throw new FatalError("Session processing timed out");
    },
  ]);

  // analyze the session
  await analyzeSession(sessionId);

  // in parallel, process the user and group + reconcile and analyze issues
  await Promise.all([
    async () => {
      if (!session.project_user_id) return;

      // analyze the user
      await analyzeUser(session.project_user_id);

      // analyze the group
      if (session.project_group_id)
        await analyzeGroup(session.project_group_id);
    },
    async () => {
      // reconcile issues
      const { issueIds } = await reconcileIssues(sessionId);

      // analyze each issue in parallel
      await Promise.all(issueIds.map((issueId) => analyzeIssue(issueId)));
    },
  ]);

  await next(session.project_id);
}
