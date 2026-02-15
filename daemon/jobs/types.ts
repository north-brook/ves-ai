import type { PostHogRecording } from "../../connectors/posthog";

export type JobStatus = "queued" | "running" | "complete" | "failed";

export type AnalyzeSessionPayload = {
  sessionId: string;
  recording?: PostHogRecording;
};

export type JobType = "analyze_session";

export type JobPayloadMap = {
  analyze_session: AnalyzeSessionPayload;
};

export type JobRecord<T extends JobType = JobType> = {
  id: string;
  type: T;
  status: JobStatus;
  payload: JobPayloadMap[T];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  result?: Record<string, unknown>;
  logs: string[];
};
