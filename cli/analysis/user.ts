import {
  type AggregateAnalysis,
  analyzeUserAggregate,
  createVertexClient,
} from "../../connectors/gemini";
import {
  findRecordingsByUserEmail,
  type PostHogRecording,
} from "../../connectors/posthog";
import { writeUserMarkdown } from "../../workspace";
import type { SessionBatchProgressCallback } from "./session";
import type { CoreContext, SessionAnalysisResult } from "./types";

export type UserAnalysisResult = {
  email: string;
  sessionCount: number;
  averageSessionScore: number;
  userScore: number;
  story: string;
  health: string;
  markdownPath: string;
};

export type AnalyzeUserDeps = {
  findRecordingsByUserEmail: (params: {
    host?: string;
    apiKey: string;
    projectId: string;
    email: string;
    domainFilter: string;
  }) => Promise<PostHogRecording[]>;
  renderAndAnalyzeSessions: (params: {
    recordings: PostHogRecording[];
    context: CoreContext;
    concurrency?: number;
    onProgress?: SessionBatchProgressCallback;
  }) => Promise<SessionAnalysisResult[]>;
  createVertexClient: typeof createVertexClient;
  analyzeUserAggregate: typeof analyzeUserAggregate;
  summarizeSessionResults: (results: SessionAnalysisResult[]) => {
    averageScore: number;
    count: number;
  };
  writeUserMarkdown: (params: {
    id: string;
    name: string;
    frontmatter: Record<string, unknown>;
    body: string;
    homeDir?: string;
  }) => Promise<string>;
  now: () => string;
};

async function getDefaultDeps(): Promise<AnalyzeUserDeps> {
  const sessionAnalysis = await import("./session");

  return {
    findRecordingsByUserEmail,
    renderAndAnalyzeSessions: sessionAnalysis.renderAndAnalyzeSessions,
    createVertexClient,
    analyzeUserAggregate,
    summarizeSessionResults: sessionAnalysis.summarizeSessionResults,
    writeUserMarkdown,
    now: () => new Date().toISOString(),
  };
}

export function buildUserAggregateSessions(
  sessionResults: SessionAnalysisResult[]
) {
  return sessionResults
    .slice()
    .sort(
      (a, b) =>
        new Date(a.recording.start_time || 0).getTime() -
        new Date(b.recording.start_time || 0).getTime()
    )
    .map((result) => ({
      sessionId: result.recording.id,
      startedAt: result.recording.start_time ?? null,
      endedAt: result.recording.end_time ?? null,
      activeSeconds: result.recording.active_seconds ?? null,
      inactiveSeconds: result.recording.inactive_seconds ?? null,
      startUrl: result.recording.start_url ?? null,
      videoUri: result.render.videoUri,
      eventsUri: result.render.eventsUri,
      sessionAnalysis: result.analysis,
    }));
}

export async function analyzeUserByEmailWithDeps(params: {
  email: string;
  context: CoreContext;
  sessionConcurrency?: number;
  onSessionProgress?: SessionBatchProgressCallback;
  deps: AnalyzeUserDeps;
}): Promise<UserAnalysisResult> {
  const deps = params.deps;
  const { email, context } = params;

  const recordings = await deps.findRecordingsByUserEmail({
    host: context.config.posthog.host,
    apiKey: context.config.posthog.apiKey,
    projectId: context.config.posthog.projectId,
    email,
    domainFilter: context.config.posthog.domainFilter,
  });

  if (!recordings.length) {
    throw new Error(`No sessions found for user ${email}`);
  }

  const sessionResults = await deps.renderAndAnalyzeSessions({
    recordings,
    context,
    concurrency: params.sessionConcurrency,
    onProgress: params.onSessionProgress,
  });

  // Contract: complete per-session analysis first, then one aggregate inference
  // over all analyzed sessions + metadata.
  const sessionsForAggregate = buildUserAggregateSessions(sessionResults);

  const ai = deps.createVertexClient(
    context.config.gcloud.projectId,
    context.config.vertex.location
  );

  const aggregate: AggregateAnalysis = await deps.analyzeUserAggregate({
    ai,
    model: context.config.vertex.model,
    productDescription: context.config.product.description,
    email,
    sessions: sessionsForAggregate,
  });

  const summary = deps.summarizeSessionResults(sessionResults);

  const markdownPath = await deps.writeUserMarkdown({
    id: email,
    name: email,
    frontmatter: {
      email,
      session_count: sessionResults.length,
      average_session_score: summary.averageScore,
      score: aggregate.score,
      health: aggregate.health,
      generated_at: deps.now(),
      session_ids: sessionResults.map((session) => session.recording.id),
    },
    body: `${aggregate.story}\n\n## Health\n\n${aggregate.health}\n\n## Sessions\n\n${sessionResults
      .slice()
      .sort(
        (a, b) =>
          new Date(a.recording.start_time || 0).getTime() -
          new Date(b.recording.start_time || 0).getTime()
      )
      .map(
        (session, index) =>
          `${index + 1}. ${session.analysis.name} (${session.recording.id}) - score ${session.analysis.score}`
      )
      .join("\n")}`,
    homeDir: context.homeDir,
  });

  return {
    email,
    sessionCount: sessionResults.length,
    averageSessionScore: summary.averageScore,
    userScore: aggregate.score,
    story: aggregate.story,
    health: aggregate.health,
    markdownPath,
  };
}

export async function analyzeUserByEmail(params: {
  email: string;
  context: CoreContext;
  sessionConcurrency?: number;
  onSessionProgress?: SessionBatchProgressCallback;
}): Promise<UserAnalysisResult> {
  const deps = await getDefaultDeps();
  return analyzeUserByEmailWithDeps({
    email: params.email,
    context: params.context,
    sessionConcurrency: params.sessionConcurrency,
    onSessionProgress: params.onSessionProgress,
    deps,
  });
}
