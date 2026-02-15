import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_VERTEX_MODEL, getVesaiPaths } from "../../config";
import {
  analyzeSessionVideo,
  createVertexClient,
  getRecordingUserEmail,
  type PostHogRecording,
} from "../../connectors";
import constructEvents from "../../render/events";
import constructVideo from "../../render/replay";
import { writeSessionMarkdown } from "../../workspace";
import type {
  CoreContext,
  RenderedSession,
  SessionAnalysisResult,
} from "./types";

function shouldSuppressRenderLogs(): boolean {
  return process.env.VESAI_SILENT_RENDER_LOGS !== "0";
}

async function withSuppressedRenderLogs<T>(task: () => Promise<T>): Promise<T> {
  if (!shouldSuppressRenderLogs()) {
    return task();
  }

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};

  try {
    return await task();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}

export type SessionBatchProgressEvent =
  | {
      type: "batch-start";
      totalSessions: number;
      concurrency: number;
      totalEstimatedSeconds: number;
      totalActiveSeconds: number;
    }
  | {
      type: "session-start";
      index: number;
      totalSessions: number;
      sessionId: string;
      estimatedSeconds: number;
      activeSeconds: number;
    }
  | {
      type: "session-complete";
      index: number;
      totalSessions: number;
      completed: number;
      sessionId: string;
      estimatedSeconds: number;
      elapsedMs: number;
    }
  | {
      type: "session-failed";
      index: number;
      totalSessions: number;
      completed: number;
      sessionId: string;
      estimatedSeconds: number;
      elapsedMs: number;
      error: string;
    }
  | {
      type: "batch-complete";
      totalSessions: number;
      elapsedMs: number;
    };

export type SessionBatchProgressCallback = (
  event: SessionBatchProgressEvent
) => void;

const SESSION_REPLAY_MODEL = DEFAULT_VERTEX_MODEL;

class Semaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async acquire(): Promise<() => void> {
    if (this.active < this.limit) {
      this.active += 1;
      return () => this.release();
    }

    await new Promise<void>((resolve) => {
      this.waiters.push(() => {
        this.active += 1;
        resolve();
      });
    });

    return () => this.release();
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.waiters.shift();
    if (next && this.active < this.limit) {
      next();
    }
  }
}

// Reuse semaphores by limit so concurrent commands in one process share a
// single render gate (instead of each creating independent limits).
const renderSemaphores = new Map<number, Semaphore>();

function getRenderSemaphore(limit: number): Semaphore {
  const normalized = Math.max(1, Math.floor(limit));
  const existing = renderSemaphores.get(normalized);
  if (existing) {
    return existing;
  }

  const created = new Semaphore(normalized);
  renderSemaphores.set(normalized, created);
  return created;
}

function getRenderCachePath(sessionId: string, homeDir?: string): string {
  const paths = getVesaiPaths(homeDir);
  return join(paths.cacheDir, "renders", `${sessionId}.json`);
}

async function readRenderCache(
  sessionId: string,
  homeDir?: string
): Promise<RenderedSession | null> {
  try {
    const raw = await readFile(getRenderCachePath(sessionId, homeDir), "utf8");
    const parsed = JSON.parse(raw) as RenderedSession;
    if (parsed.videoUri && parsed.eventsUri) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeRenderCache(
  sessionId: string,
  render: RenderedSession,
  homeDir?: string
): Promise<void> {
  const path = getRenderCachePath(sessionId, homeDir);
  await mkdir(join(getVesaiPaths(homeDir).cacheDir, "renders"), {
    recursive: true,
  });
  await writeFile(path, JSON.stringify(render, null, 2), "utf8");
}

export async function ensureSessionRendered(
  recording: PostHogRecording,
  context: CoreContext
): Promise<RenderedSession> {
  const cached = await readRenderCache(recording.id, context.homeDir);
  if (cached) {
    return cached;
  }

  const semaphore = getRenderSemaphore(
    context.config.runtime.maxConcurrentRenders
  );
  const release = await semaphore.acquire();
  try {
    const cachedAfterWait = await readRenderCache(
      recording.id,
      context.homeDir
    );
    if (cachedAfterWait) {
      return cachedAfterWait;
    }

    process.env.VESAI_GCS_BUCKET = context.config.gcloud.bucket;

    const { events, video } = await withSuppressedRenderLogs(async () => {
      const events = await constructEvents({
        source_type: "posthog",
        source_host: context.config.posthog.host,
        source_key: context.config.posthog.apiKey,
        source_project: context.config.posthog.projectId,
        external_id: recording.id,
        project_id: context.config.posthog.projectId,
        session_id: recording.id,
        bucket_name: context.config.gcloud.bucket,
      });

      const video = await constructVideo({
        projectId: context.config.posthog.projectId,
        sessionId: recording.id,
        eventsPath: events.eventsPath,
        bucketName: context.config.gcloud.bucket,
        config: {
          speed: 1,
          skipInactive: true,
          mouseTail: {
            strokeStyle: "red",
            lineWidth: 2,
            lineCap: "round",
          },
        },
      });

      return { events, video };
    });

    const render: RenderedSession = {
      sessionId: recording.id,
      eventsUri: events.eventsUri,
      videoUri: video.videoUri,
      videoDuration: Math.round(video.videoDuration),
      renderedAt: new Date().toISOString(),
    };

    await writeRenderCache(recording.id, render, context.homeDir);
    return render;
  } finally {
    release();
  }
}

export async function analyzeRenderedSession(params: {
  recording: PostHogRecording;
  render: RenderedSession;
  context: CoreContext;
}): Promise<SessionAnalysisResult> {
  const ai = createVertexClient(
    params.context.config.gcloud.projectId,
    params.context.config.vertex.location
  );

  const analysis = await analyzeSessionVideo({
    ai,
    // Session replay analysis is pinned to the current video-first model.
    model: SESSION_REPLAY_MODEL,
    productDescription: params.context.config.product.description,
    videoUri: params.render.videoUri,
    eventUri: params.render.eventsUri,
    metadata: {
      sessionId: params.recording.id,
      startedAt: params.recording.start_time,
      endedAt: params.recording.end_time,
      activeSeconds: params.recording.active_seconds,
      inactiveSeconds: params.recording.inactive_seconds,
      startUrl: params.recording.start_url,
      person: params.recording.person,
    },
  });

  const sessionName = analysis.name || `Session ${params.recording.id}`;
  const markdownPath = await writeSessionMarkdown({
    id: params.recording.id,
    name: sessionName,
    frontmatter: {
      id: params.recording.id,
      session_id: params.recording.id,
      user_email: getRecordingUserEmail(params.recording),
      start_time: params.recording.start_time || null,
      end_time: params.recording.end_time || null,
      active_seconds: params.recording.active_seconds ?? null,
      video_uri: params.render.videoUri,
      events_uri: params.render.eventsUri,
      score: analysis.score,
      health: analysis.health,
      generated_at: new Date().toISOString(),
    },
    body: `${analysis.story}\n\n## Health\n\n${analysis.health}\n\n## Features\n\n${analysis.features.map((f) => `- ${f}`).join("\n")}\n\n## Issues\n\n${analysis.detectedIssues.map((issue) => `### ${issue.name}\n- Type: ${issue.type}\n- Severity: ${issue.severity}\n- Priority: ${issue.priority}\n- Confidence: ${issue.confidence}\n\n${issue.story}`).join("\n\n")}`,
    homeDir: params.context.homeDir,
  });

  return {
    recording: params.recording,
    render: params.render,
    analysis,
    markdownPath,
  };
}

export async function renderAndAnalyzeSession(
  recording: PostHogRecording,
  context: CoreContext
): Promise<SessionAnalysisResult> {
  const render = await ensureSessionRendered(recording, context);
  return analyzeRenderedSession({ recording, render, context });
}

export async function renderAndAnalyzeSessions(params: {
  recordings: PostHogRecording[];
  context: CoreContext;
  concurrency?: number;
  onProgress?: SessionBatchProgressCallback;
}): Promise<SessionAnalysisResult[]> {
  const recordings = params.recordings;
  if (!recordings.length) {
    return [];
  }

  const concurrency = Math.max(
    1,
    Math.floor(
      params.concurrency ?? params.context.config.runtime.maxConcurrentRenders
    )
  );
  const effectiveConcurrency = Math.min(concurrency, recordings.length);
  const estimatedSecondsByIndex = recordings.map((recording) => {
    const activeSeconds = Math.max(1, Number(recording.active_seconds ?? 0));
    const renderMultiplier = 1.65;
    const baselineSeconds = 24;
    return Math.max(
      25,
      Math.round(activeSeconds * renderMultiplier + baselineSeconds)
    );
  });

  const totalEstimatedSeconds = estimatedSecondsByIndex.reduce(
    (sum, value) => sum + value,
    0
  );
  const totalActiveSeconds = recordings.reduce(
    (sum, recording) =>
      sum + Math.max(0, Number(recording.active_seconds ?? 0)),
    0
  );

  params.onProgress?.({
    type: "batch-start",
    totalSessions: recordings.length,
    concurrency: effectiveConcurrency,
    totalEstimatedSeconds,
    totalActiveSeconds,
  });

  const startedAt = Date.now();
  const results = new Array<SessionAnalysisResult>(recordings.length);
  let cursor = 0;
  let completed = 0;
  let fatalError: Error | null = null;

  async function worker(): Promise<void> {
    while (true) {
      if (fatalError) {
        return;
      }

      const index = cursor;
      cursor += 1;
      if (index >= recordings.length) {
        return;
      }

      const recording = recordings[index]!;
      const estimatedSeconds = estimatedSecondsByIndex[index]!;
      const sessionStartedAt = Date.now();

      params.onProgress?.({
        type: "session-start",
        index,
        totalSessions: recordings.length,
        sessionId: recording.id,
        estimatedSeconds,
        activeSeconds: Math.max(0, Number(recording.active_seconds ?? 0)),
      });

      try {
        const result = await renderAndAnalyzeSession(recording, params.context);
        results[index] = result;
        completed += 1;
        params.onProgress?.({
          type: "session-complete",
          index,
          totalSessions: recordings.length,
          completed,
          sessionId: recording.id,
          estimatedSeconds,
          elapsedMs: Date.now() - sessionStartedAt,
        });
      } catch (error) {
        completed += 1;
        const err = error instanceof Error ? error : new Error(String(error));
        fatalError = err;
        params.onProgress?.({
          type: "session-failed",
          index,
          totalSessions: recordings.length,
          completed,
          sessionId: recording.id,
          estimatedSeconds,
          elapsedMs: Date.now() - sessionStartedAt,
          error: err.message,
        });
        return;
      }
    }
  }

  await Promise.all(
    Array.from({ length: effectiveConcurrency }, async () => worker())
  );

  params.onProgress?.({
    type: "batch-complete",
    totalSessions: recordings.length,
    elapsedMs: Date.now() - startedAt,
  });

  if (fatalError) {
    throw fatalError;
  }

  return results.filter(Boolean);
}

export function summarizeSessionResults(results: SessionAnalysisResult[]): {
  averageScore: number;
  count: number;
} {
  if (!results.length) {
    return { averageScore: 0, count: 0 };
  }

  const sum = results.reduce((acc, result) => acc + result.analysis.score, 0);
  return {
    averageScore: Math.round(sum / results.length),
    count: results.length,
  };
}
