import {
  analyzeGroupAggregate,
  createVertexClient,
  findRecordingsByGroupId,
  getRecordingUserEmail,
} from "../../connectors";
import { writeGroupMarkdown } from "../../workspace";
import type { SessionBatchProgressCallback } from "./session";
import type { CoreContext } from "./types";
import { analyzeUserByEmail } from "./user";

export async function analyzeGroupById(params: {
  groupId: string;
  context: CoreContext;
  sessionConcurrency?: number;
  onSessionProgress?: SessionBatchProgressCallback;
}): Promise<{
  groupId: string;
  usersAnalyzed: number;
  score: number;
  story: string;
  health: string;
  markdownPath: string;
}> {
  const recordings = await findRecordingsByGroupId({
    host: params.context.config.posthog.host,
    apiKey: params.context.config.posthog.apiKey,
    projectId: params.context.config.posthog.projectId,
    groupKey: params.context.config.posthog.groupKey,
    groupId: params.groupId,
    domainFilter: params.context.config.posthog.domainFilter,
  });

  if (!recordings.length) {
    throw new Error(`No sessions found for group ${params.groupId}`);
  }

  const emailSet = new Set<string>();
  for (const recording of recordings) {
    const email = getRecordingUserEmail(recording);
    if (email) {
      emailSet.add(email);
    }
  }

  const users = Array.from(emailSet);
  if (!users.length) {
    throw new Error(
      `Group ${params.groupId} has sessions, but no resolvable user emails`
    );
  }

  const userResults = [] as Awaited<ReturnType<typeof analyzeUserByEmail>>[];
  for (const email of users) {
    const result = await analyzeUserByEmail({
      email,
      context: params.context,
      sessionConcurrency: params.sessionConcurrency,
      onSessionProgress: params.onSessionProgress,
    });
    userResults.push(result);
  }

  const ai = createVertexClient(
    params.context.config.gcloud.projectId,
    params.context.config.vertex.location
  );

  const aggregate = await analyzeGroupAggregate({
    ai,
    model: params.context.config.vertex.model,
    productDescription: params.context.config.product.description,
    groupId: params.groupId,
    users: userResults.map((user) => ({
      email: user.email,
      sessions: user.sessionCount,
      story: user.story,
      health: user.health,
      score: user.userScore,
    })),
  });

  const markdownPath = await writeGroupMarkdown({
    id: params.groupId,
    name: params.groupId,
    frontmatter: {
      group_id: params.groupId,
      users_analyzed: userResults.length,
      score: aggregate.score,
      health: aggregate.health,
      generated_at: new Date().toISOString(),
      users: userResults.map((user) => user.email),
    },
    body: `${aggregate.story}\n\n## Health\n\n${aggregate.health}\n\n## Users\n\n${userResults.map((user) => `- ${user.email}: score ${user.userScore}`).join("\n")}`,
    homeDir: params.context.homeDir,
  });

  return {
    groupId: params.groupId,
    usersAnalyzed: userResults.length,
    score: aggregate.score,
    story: aggregate.story,
    health: aggregate.health,
    markdownPath,
  };
}
