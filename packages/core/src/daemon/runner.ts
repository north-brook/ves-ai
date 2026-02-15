import { readFile, rm, writeFile } from "node:fs/promises";
import { getVesaiPaths } from "../../../config/src";
import { findRecordingById } from "../../../connectors/src";
import {
  analyzeGroupById,
  analyzeQuery,
  analyzeUserByEmail,
  renderAndAnalyzeSession,
} from "../analysis";
import {
  appendJobLog,
  listQueuedJobs,
  readJob,
  updateJobStatus,
} from "../jobs/store";
import type { JobPayloadMap, JobRecord } from "../jobs/types";

export type DaemonOptions = {
  homeDir?: string;
  intervalMs?: number;
};

let shouldStop = false;

async function writePidFile(homeDir?: string): Promise<void> {
  const paths = getVesaiPaths(homeDir);
  await writeFile(paths.daemonPidFile, String(process.pid), "utf8");
}

async function removePidFile(homeDir?: string): Promise<void> {
  const paths = getVesaiPaths(homeDir);
  await rm(paths.daemonPidFile, { force: true });
}

async function isJobAlreadyRunning(
  job: JobRecord,
  homeDir?: string
): Promise<boolean> {
  const latest = await readJob(job.id, homeDir);
  return latest?.status === "running";
}

async function processJob(
  job: JobRecord,
  configHomeDir?: string
): Promise<void> {
  const { requireConfig } = await import("../../../config/src/index");
  const config = await requireConfig(configHomeDir);

  await updateJobStatus({
    id: job.id,
    status: "running",
    homeDir: configHomeDir,
  });
  await appendJobLog(job.id, `Started ${job.type}`, configHomeDir);

  try {
    const context = { config, homeDir: configHomeDir };

    if (job.type === "analyze_session") {
      const payload = job.payload as JobPayloadMap["analyze_session"];
      const recording = await findRecordingById({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        sessionId: payload.sessionId,
      });

      if (!recording) {
        throw new Error(
          `Session ${payload.sessionId} was not found in PostHog`
        );
      }

      await appendJobLog(
        job.id,
        `Rendering and analyzing session ${recording.id}`,
        configHomeDir
      );
      const result = await renderAndAnalyzeSession(recording, context);

      await updateJobStatus({
        id: job.id,
        status: "complete",
        homeDir: configHomeDir,
        result: {
          sessionId: recording.id,
          score: result.analysis.score,
          markdownPath: result.markdownPath,
          videoUri: result.render.videoUri,
        },
      });

      await appendJobLog(
        job.id,
        `Completed session ${recording.id}`,
        configHomeDir
      );
      return;
    }

    if (job.type === "analyze_user") {
      const payload = job.payload as JobPayloadMap["analyze_user"];
      await appendJobLog(
        job.id,
        `Fetching sessions and analyzing user ${payload.email}`,
        configHomeDir
      );
      const result = await analyzeUserByEmail({
        email: payload.email,
        context,
      });

      await updateJobStatus({
        id: job.id,
        status: "complete",
        homeDir: configHomeDir,
        result: {
          email: result.email,
          sessionCount: result.sessionCount,
          score: result.userScore,
          markdownPath: result.markdownPath,
        },
      });
      await appendJobLog(
        job.id,
        `Completed user ${payload.email}`,
        configHomeDir
      );
      return;
    }

    if (job.type === "analyze_group") {
      const payload = job.payload as JobPayloadMap["analyze_group"];
      await appendJobLog(
        job.id,
        `Fetching sessions and analyzing group ${payload.groupId}`,
        configHomeDir
      );
      const result = await analyzeGroupById({
        groupId: payload.groupId,
        context,
      });

      await updateJobStatus({
        id: job.id,
        status: "complete",
        homeDir: configHomeDir,
        result: {
          groupId: result.groupId,
          usersAnalyzed: result.usersAnalyzed,
          score: result.score,
          markdownPath: result.markdownPath,
        },
      });
      await appendJobLog(
        job.id,
        `Completed group ${payload.groupId}`,
        configHomeDir
      );
      return;
    }

    if (job.type === "analyze_query") {
      const payload = job.payload as JobPayloadMap["analyze_query"];
      const queryLabel =
        payload.query ||
        (payload.filters ? JSON.stringify(payload.filters) : "<empty-query>");
      await appendJobLog(
        job.id,
        `Analyzing query ${queryLabel}`,
        configHomeDir
      );
      const result = await analyzeQuery({
        query: payload.query,
        filters: payload.filters,
        context,
      });

      await updateJobStatus({
        id: job.id,
        status: "complete",
        homeDir: configHomeDir,
        result: {
          query: result.query,
          filters: result.filters,
          sessionCount: result.sessionCount,
          averageScore: result.averageScore,
        },
      });
      await appendJobLog(
        job.id,
        `Completed query ${queryLabel}`,
        configHomeDir
      );
      return;
    }

    throw new Error(`Unsupported job type ${job.type}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateJobStatus({
      id: job.id,
      status: "failed",
      homeDir: configHomeDir,
      error: message,
    });
    await appendJobLog(job.id, `Failed: ${message}`, configHomeDir);
  }
}

export async function startDaemon(options?: DaemonOptions): Promise<void> {
  const intervalMs = options?.intervalMs ?? 1000;
  const homeDir = options?.homeDir;
  const paths = getVesaiPaths(homeDir);

  try {
    const existingPid = await readFile(paths.daemonPidFile, "utf8");
    const pid = Number(existingPid.trim());
    if (Number.isFinite(pid)) {
      try {
        process.kill(pid, 0);
        throw new Error(`Daemon already running with pid ${pid}`);
      } catch {
        // stale pid
      }
    }
  } catch {
    // ignore missing pid file
  }

  await writePidFile(homeDir);
  shouldStop = false;

  const inFlight = new Set<string>();
  const workerEnv = process.env.VESAI_DAEMON_WORKERS;
  const parsedWorkerEnv = workerEnv ? Number(workerEnv) : Number.NaN;
  const maxWorkers =
    workerEnv && Number.isFinite(parsedWorkerEnv) && parsedWorkerEnv > 0
      ? Math.floor(parsedWorkerEnv)
      : Number.POSITIVE_INFINITY;

  const onSignal = async () => {
    shouldStop = true;
  };

  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];
  for (const signal of signals) {
    process.on(signal, onSignal);
  }

  while (!shouldStop) {
    const queued = await listQueuedJobs(homeDir);

    for (const job of queued) {
      if (inFlight.size >= maxWorkers) {
        break;
      }
      if (inFlight.has(job.id)) {
        continue;
      }
      if (await isJobAlreadyRunning(job, homeDir)) {
        continue;
      }

      inFlight.add(job.id);
      processJob(job, homeDir)
        .catch(() => {
          // processJob already persists failures.
        })
        .finally(() => {
          inFlight.delete(job.id);
        });
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  while (inFlight.size > 0) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  for (const signal of signals) {
    process.off(signal, onSignal);
  }

  await removePidFile(homeDir);
}
