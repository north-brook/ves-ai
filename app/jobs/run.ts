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
  const replayHookResponse = await Promise.race([replayHook, sleep("6 hours")]);
  if (replayHookResponse && !replayHookResponse.success)
    throw new FatalError("Session processing failed");

  // analyze the session
  const { session } = await analyzeSession(sessionId);

  // analyze the user
  if (session.project_user_id) await analyzeUser(session.project_user_id);

  // analyze the group
  if (session.project_group_id) await analyzeGroup(session.project_group_id);

  // reconcile issues
  const { issueIds } = await reconcileIssues(sessionId);

  // analyze each issue in parallel
  await Promise.all(issueIds.map((issueId) => analyzeIssue(issueId)));

  // kick off the next session
  await next(session.project_id);
}
