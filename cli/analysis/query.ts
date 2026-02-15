import { findRecordingsByQuery } from "../../connectors";
import type { PostHogQueryFilters } from "../../connectors/posthog";
import type { SessionBatchProgressCallback } from "./session";
import { renderAndAnalyzeSessions, summarizeSessionResults } from "./session";
import type { CoreContext } from "./types";

export async function analyzeQuery(params: {
  query?: string;
  filters?: PostHogQueryFilters;
  context: CoreContext;
  sessionConcurrency?: number;
  onSessionProgress?: SessionBatchProgressCallback;
}): Promise<{
  query: string;
  sessionCount: number;
  averageScore: number;
  filters?: PostHogQueryFilters;
}> {
  const recordings = await findRecordingsByQuery({
    host: params.context.config.posthog.host,
    apiKey: params.context.config.posthog.apiKey,
    projectId: params.context.config.posthog.projectId,
    query: params.query,
    filters: params.filters,
    domainFilter: params.context.config.posthog.domainFilter,
  });

  if (!recordings.length) {
    throw new Error("No sessions found for the provided query filters.");
  }

  const sessions = await renderAndAnalyzeSessions({
    recordings,
    context: params.context,
    concurrency: params.sessionConcurrency,
    onProgress: params.onSessionProgress,
  });
  const summary = summarizeSessionResults(sessions);

  return {
    query: params.query || "",
    sessionCount: summary.count,
    averageScore: summary.averageScore,
    filters: params.filters,
  };
}
