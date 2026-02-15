import { randomUUID } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getVesaiPaths } from "../../config";
import type { JobRecord, JobStatus, JobType } from "./types";

function jobPath(id: string, homeDir?: string): string {
  const paths = getVesaiPaths(homeDir);
  return join(paths.jobsDir, `${id}.json`);
}

export async function createJob<T extends JobType>(params: {
  type: T;
  payload: JobRecord<T>["payload"];
  homeDir?: string;
}): Promise<JobRecord<T>> {
  const now = new Date().toISOString();
  const id = randomUUID();

  const job: JobRecord<T> = {
    id,
    type: params.type,
    payload: params.payload,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    logs: ["Job queued"],
  };

  await writeFile(
    jobPath(id, params.homeDir),
    JSON.stringify(job, null, 2),
    "utf8"
  );
  return job;
}

export async function readJob(
  id: string,
  homeDir?: string
): Promise<JobRecord | null> {
  try {
    const raw = await readFile(jobPath(id, homeDir), "utf8");
    return JSON.parse(raw) as JobRecord;
  } catch {
    return null;
  }
}

export async function writeJob(
  job: JobRecord,
  homeDir?: string
): Promise<void> {
  await writeFile(
    jobPath(job.id, homeDir),
    JSON.stringify(job, null, 2),
    "utf8"
  );
}

export async function appendJobLog(
  id: string,
  message: string,
  homeDir?: string
): Promise<JobRecord> {
  const job = await readJob(id, homeDir);
  if (!job) {
    throw new Error(`Job ${id} not found`);
  }

  job.logs.push(`[${new Date().toISOString()}] ${message}`);
  job.updatedAt = new Date().toISOString();
  await writeJob(job, homeDir);
  return job;
}

export async function updateJobStatus(params: {
  id: string;
  status: JobStatus;
  homeDir?: string;
  error?: string;
  result?: Record<string, unknown>;
}): Promise<JobRecord> {
  const job = await readJob(params.id, params.homeDir);
  if (!job) {
    throw new Error(`Job ${params.id} not found`);
  }

  const now = new Date().toISOString();
  job.status = params.status;
  job.updatedAt = now;

  if (params.status === "running") {
    job.startedAt = now;
  }

  if (params.status === "complete" || params.status === "failed") {
    job.finishedAt = now;
  }

  if (params.error) {
    job.error = params.error;
  }

  if (params.result) {
    job.result = params.result;
  }

  await writeJob(job, params.homeDir);
  return job;
}

export async function listJobs(homeDir?: string): Promise<JobRecord[]> {
  const paths = getVesaiPaths(homeDir);
  const files = await readdir(paths.jobsDir).catch(() => []);

  const jobs = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        const raw = await readFile(join(paths.jobsDir, file), "utf8");
        return JSON.parse(raw) as JobRecord;
      })
  );

  return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listQueuedJobs(homeDir?: string): Promise<JobRecord[]> {
  const jobs = await listJobs(homeDir);
  return jobs.filter((job) => job.status === "queued");
}
