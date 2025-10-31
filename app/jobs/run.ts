import { createHook, FatalError, sleep } from "workflow";
import { analyzeGroup } from "./analyze-group";
import { analyzeIssue } from "./analyze-issue";
import { analyzeSession } from "./analyze-session";
import { analyzeUser } from "./analyze-user";
import next from "./next";
import { processReplay } from "./process-replay";
import { reconcileIssues } from "./reconcile-issues";

export async function run(sessionId: string) {
  "use workflow";

  // process replay using the cloud service with a timeout
  const replayHook = createHook<{ success: boolean }>({
    token: `session:${sessionId}`,
  });
  await processReplay(sessionId);
  Promise.race([
    replayHook,
    async () => {
      sleep("6 hours");
      throw new FatalError("Session processing timed out");
    },
  ]);

  // analyze the session
  const { session } = await analyzeSession(sessionId);

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
