import { ReplayError, ReplaySuccess } from "@/cloud/src/types";
import { createWebhook, FatalError } from "workflow";
import { analyzeGroup } from "./analyze-group";
import { analyzeIssue } from "./analyze-issue";
import { analyzeSession } from "./analyze-session";
import { analyzeUser } from "./analyze-user";
import { fail } from "./fail";
import { next } from "./next";
import { processReplay } from "./process-replay";
import { reconcileIssues } from "./reconcile-issues";

export async function analysis(sessionId: string) {
  "use workflow";

  try {
    // process replay using the cloud service
    const webhook = createWebhook();
    await processReplay(sessionId, webhook.url);
    const request = await webhook;
    const replay = (await request.json()) as ReplaySuccess | ReplayError;
    if (!replay.success) {
      await fail(sessionId);
      throw new FatalError("Session processing failed");
    }

    // analyze the session
    const session = await analyzeSession(sessionId, replay);

    // analyze the user
    if (session.project_user_id) await analyzeUser(session.project_user_id);

    // analyze the group
    if (session.project_group_id) await analyzeGroup(session.project_group_id);

    // reconcile issues
    const issueIds = await reconcileIssues(sessionId);

    // analyze each issue in parallel
    await Promise.all(issueIds.map((issueId) => analyzeIssue(issueId)));

    // kick off the next session
    await next(session.project_id);
  } catch (error) {
    await fail(sessionId);
    throw error;
  }
}
