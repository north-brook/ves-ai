import { describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureProjectDirectories } from "../config";
import {
  appendJobLog,
  createJob,
  listJobs,
  listQueuedJobs,
  readJob,
  updateJobStatus,
} from "../daemon/jobs/store";

async function withTempHome(run: (homeDir: string) => Promise<void>) {
  const homeDir = await mkdtemp(join(tmpdir(), "vesai-jobs-test-"));
  try {
    await ensureProjectDirectories(homeDir);
    await run(homeDir);
  } finally {
    await rm(homeDir, { recursive: true, force: true });
  }
}

describe("job store", () => {
  it("creates and reads jobs", async () => {
    await withTempHome(async (homeDir) => {
      const job = await createJob({
        type: "analyze_session",
        payload: { sessionId: "session_123" },
        homeDir,
      });

      const loaded = await readJob(job.id, homeDir);
      expect(loaded?.id).toBe(job.id);
      expect(loaded?.status).toBe("queued");
      expect(loaded?.logs[0]).toContain("Job queued");
    });
  });

  it("tracks running and completion lifecycle", async () => {
    await withTempHome(async (homeDir) => {
      const job = await createJob({
        type: "analyze_session",
        payload: { sessionId: "session_abc" },
        homeDir,
      });

      const running = await updateJobStatus({
        id: job.id,
        status: "running",
        homeDir,
      });
      expect(running.startedAt).toBeDefined();

      const completed = await updateJobStatus({
        id: job.id,
        status: "complete",
        homeDir,
        result: { score: 81 },
      });
      expect(completed.finishedAt).toBeDefined();
      expect(completed.result?.score).toBe(81);
    });
  });

  it("lists queued jobs and appends logs", async () => {
    await withTempHome(async (homeDir) => {
      const queued = await createJob({
        type: "analyze_session",
        payload: { sessionId: "s1" },
        homeDir,
      });
      const notQueued = await createJob({
        type: "analyze_session",
        payload: { sessionId: "s2" },
        homeDir,
      });
      await updateJobStatus({ id: notQueued.id, status: "running", homeDir });

      await appendJobLog(queued.id, "Waiting for daemon", homeDir);

      const queuedJobs = await listQueuedJobs(homeDir);
      expect(queuedJobs.map((job) => job.id)).toEqual([queued.id]);

      const all = await listJobs(homeDir);
      expect(all.length).toBe(2);
      const loaded = await readJob(queued.id, homeDir);
      expect(
        loaded?.logs.some((entry) => entry.includes("Waiting for daemon"))
      ).toBe(true);
    });
  });
});
