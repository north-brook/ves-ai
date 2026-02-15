import { readFile, rm, writeFile } from "node:fs/promises";
import {
  analyzeGroupById,
  analyzeUserByEmail,
  renderAndAnalyzeSession,
} from "../cli/analysis";
import { getVesaiPaths, requireConfig } from "../config";
import { computeDynamicRenderServiceCapacity } from "../config/runtime";
import {
  findRecordingById,
  getRecordingUserEmail,
  listAllRecordings,
  type PostHogRecording,
} from "../connectors";
import {
  appendJobLog,
  createJob,
  listJobs,
  listQueuedJobs,
  readJob,
  updateJobStatus,
} from "./jobs/store";
import type { JobPayloadMap, JobRecord } from "./jobs/types";
import { loadDaemonState, saveDaemonState, updateDaemonState } from "./state";

export type DaemonOptions = {
  homeDir?: string;
  intervalMs?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
let shouldStop = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractGroupIdFromRecording(
  recording: PostHogRecording,
  groupKey: string
): string | null {
  const props = recording.person?.properties || {};
  const candidate = props[groupKey] ?? props[`$${groupKey}`];
  const value = String(candidate ?? "").trim();
  return value || null;
}

async function writePidFile(homeDir?: string): Promise<void> {
  const paths = getVesaiPaths(homeDir);
  await writeFile(paths.daemonPidFile, String(process.pid), "utf8");
}

async function removePidFile(homeDir?: string): Promise<void> {
  const paths = getVesaiPaths(homeDir);
  await rm(paths.daemonPidFile, { force: true });
}

async function queueSessionsFromHeartbeat(params: {
  homeDir?: string;
  nowIso: string;
}): Promise<{ queued: number; fromIso: string; bootstrapRun: boolean }> {
  const config = await requireConfig(params.homeDir);
  const state = await loadDaemonState(params.homeDir);

  const bootstrapRun = !state.lastPulledAt;
  const fromIso =
    state.lastPulledAt ||
    new Date(
      Date.now() - Math.max(1, config.runtime.lookbackDays) * DAY_MS
    ).toISOString();

  const fromMs = Date.parse(fromIso);
  const nowMs = Date.parse(params.nowIso);
  const hasCursor = Boolean(state.lastPulledAt);

  const recordings = await listAllRecordings({
    host: config.posthog.host,
    apiKey: config.posthog.apiKey,
    projectId: config.posthog.projectId,
    dateFrom: fromIso,
  });

  const existingJobs = await listJobs(params.homeDir);
  const alreadyTracked = new Set(
    existingJobs
      .filter(
        (job) => job.type === "analyze_session" && job.status !== "failed"
      )
      .map((job) => (job.payload as JobPayloadMap["analyze_session"]).sessionId)
  );

  const candidates = recordings
    .filter((recording) => {
      if (recording.ongoing) {
        return false;
      }

      if (
        config.posthog.domainFilter &&
        typeof recording.start_url === "string" &&
        !recording.start_url.includes(config.posthog.domainFilter)
      ) {
        return false;
      }

      const startedMs = recording.start_time
        ? Date.parse(recording.start_time)
        : Number.NaN;
      if (!Number.isFinite(startedMs)) {
        return true;
      }

      if (startedMs > nowMs) {
        return false;
      }

      if (hasCursor) {
        return startedMs > fromMs;
      }

      return startedMs >= fromMs;
    })
    .sort((a, b) =>
      String(a.start_time || "").localeCompare(String(b.start_time || ""))
    );

  let queued = 0;
  for (const recording of candidates) {
    if (alreadyTracked.has(recording.id)) {
      continue;
    }

    await createJob({
      type: "analyze_session",
      payload: {
        sessionId: recording.id,
        recording,
      },
      homeDir: params.homeDir,
    });
    alreadyTracked.add(recording.id);
    queued += 1;
  }

  await updateDaemonState({
    homeDir: params.homeDir,
    updater: (current) => ({
      ...current,
      backfillStartedAt:
        current.backfillStartedAt || (bootstrapRun ? params.nowIso : undefined),
      lastPulledAt: params.nowIso,
    }),
  });

  return {
    queued,
    fromIso,
    bootstrapRun,
  };
}

type ProcessSessionOutcome = {
  userEmail?: string;
  groupId?: string;
} | null;

async function processSessionJob(
  job: JobRecord,
  configHomeDir?: string
): Promise<ProcessSessionOutcome> {
  const config = await requireConfig(configHomeDir);

  await updateJobStatus({
    id: job.id,
    status: "running",
    homeDir: configHomeDir,
  });
  await appendJobLog(job.id, `Started ${job.type}`, configHomeDir);

  try {
    const context = { config, homeDir: configHomeDir };
    const payload = job.payload as JobPayloadMap["analyze_session"];

    const recording =
      payload.recording ||
      (await findRecordingById({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        sessionId: payload.sessionId,
      }));

    if (!recording) {
      throw new Error(`Session ${payload.sessionId} was not found in PostHog`);
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

    return {
      userEmail: getRecordingUserEmail(recording) || undefined,
      groupId:
        extractGroupIdFromRecording(recording, config.posthog.groupKey) ||
        undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateJobStatus({
      id: job.id,
      status: "failed",
      homeDir: configHomeDir,
      error: message,
    });
    await appendJobLog(job.id, `Failed: ${message}`, configHomeDir);
    return null;
  }
}

async function queueDirtyRollups(params: {
  homeDir?: string;
  userEmail?: string;
  groupId?: string;
}): Promise<void> {
  if (!(params.userEmail || params.groupId)) {
    return;
  }

  await updateDaemonState({
    homeDir: params.homeDir,
    updater: (state) => ({
      ...state,
      pendingUserEmails: params.userEmail
        ? [...state.pendingUserEmails, params.userEmail]
        : state.pendingUserEmails,
      pendingGroupIds: params.groupId
        ? [...state.pendingGroupIds, params.groupId]
        : state.pendingGroupIds,
    }),
  });
}

async function runPendingRollups(homeDir?: string): Promise<void> {
  const state = await loadDaemonState(homeDir);
  if (!(state.pendingUserEmails.length || state.pendingGroupIds.length)) {
    return;
  }

  const config = await requireConfig(homeDir);
  const context = { config, homeDir };
  const sessionConcurrency = computeDynamicRenderServiceCapacity({
    maxRenderMemoryMb: config.runtime.maxRenderMemoryMb,
  });

  const remainingUsers: string[] = [];
  for (const email of state.pendingUserEmails) {
    try {
      await analyzeUserByEmail({
        email,
        context,
        sessionConcurrency,
      });
    } catch (error) {
      console.error(
        `Failed user rollup ${email}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      remainingUsers.push(email);
    }
  }

  const remainingGroups: string[] = [];
  for (const groupId of state.pendingGroupIds) {
    try {
      await analyzeGroupById({
        groupId,
        context,
        sessionConcurrency,
      });
    } catch (error) {
      console.error(
        `Failed group rollup ${groupId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      remainingGroups.push(groupId);
    }
  }

  await saveDaemonState(
    {
      ...state,
      pendingUserEmails: remainingUsers,
      pendingGroupIds: remainingGroups,
    },
    homeDir
  );
}

async function maybeMarkBackfillComplete(params: {
  homeDir?: string;
  hasQueuedSessions: boolean;
  hasActiveSessions: boolean;
}): Promise<void> {
  const state = await loadDaemonState(params.homeDir);
  if (
    !state.backfillStartedAt ||
    state.backfillCompletedAt ||
    params.hasQueuedSessions ||
    params.hasActiveSessions ||
    state.pendingUserEmails.length > 0 ||
    state.pendingGroupIds.length > 0
  ) {
    return;
  }

  await saveDaemonState(
    {
      ...state,
      backfillCompletedAt: new Date().toISOString(),
    },
    params.homeDir
  );
}

export async function startDaemon(options?: DaemonOptions): Promise<void> {
  const intervalMs = options?.intervalMs ?? 30_000;
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

  const activeJobIds = new Set<string>();
  const workerCountOverride = process.env.VESAI_DAEMON_WORKERS;
  const parsedWorkerCount = workerCountOverride
    ? Number(workerCountOverride)
    : Number.NaN;

  const onSignal = async () => {
    shouldStop = true;
  };

  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];
  for (const signal of signals) {
    process.on(signal, onSignal);
  }

  while (!shouldStop) {
    const heartbeatNow = new Date().toISOString();
    try {
      const heartbeat = await queueSessionsFromHeartbeat({
        homeDir,
        nowIso: heartbeatNow,
      });
      if (heartbeat.queued > 0) {
        console.log(
          `Heartbeat queued ${heartbeat.queued} sessions (from ${heartbeat.fromIso} to ${heartbeatNow}).`
        );
      }
    } catch (error) {
      console.error(
        `Heartbeat failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const queued = await listQueuedJobs(homeDir);
    const queuedSessionJobs = queued.filter(
      (job) => job.type === "analyze_session"
    );
    const maxWorkers =
      workerCountOverride &&
      Number.isFinite(parsedWorkerCount) &&
      parsedWorkerCount > 0
        ? Math.floor(parsedWorkerCount)
        : computeDynamicRenderServiceCapacity({
            maxRenderMemoryMb: (await requireConfig(homeDir)).runtime
              .maxRenderMemoryMb,
          });

    for (const job of queuedSessionJobs) {
      if (activeJobIds.size >= maxWorkers) {
        break;
      }
      if (activeJobIds.has(job.id)) {
        continue;
      }

      const latestJob = await readJob(job.id, homeDir);
      if (latestJob?.status === "running") {
        continue;
      }

      activeJobIds.add(job.id);
      processSessionJob(job, homeDir)
        .then(async (outcome) => {
          if (!outcome) {
            return;
          }
          await queueDirtyRollups({
            homeDir,
            userEmail: outcome.userEmail,
            groupId: outcome.groupId,
          });
        })
        .catch(() => {
          // processSessionJob already persists failures.
        })
        .finally(() => {
          activeJobIds.delete(job.id);
        });
    }

    const hasQueuedSessions = queuedSessionJobs.length > 0;
    const hasActiveSessions = activeJobIds.size > 0;

    if (!(hasQueuedSessions || hasActiveSessions)) {
      await runPendingRollups(homeDir);
      await maybeMarkBackfillComplete({
        homeDir,
        hasQueuedSessions,
        hasActiveSessions,
      });
    }

    await sleep(intervalMs);
  }

  while (activeJobIds.size > 0) {
    await sleep(250);
  }

  for (const signal of signals) {
    process.off(signal, onSignal);
  }

  await removePidFile(homeDir);
}
