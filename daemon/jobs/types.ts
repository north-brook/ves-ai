import type { PostHogQueryFilters } from "../../connectors/posthog";

export type JobStatus = "queued" | "running" | "complete" | "failed";

export type AnalyzeSessionPayload = {
  sessionId: string;
};

export type AnalyzeUserPayload = {
  email: string;
};

export type AnalyzeGroupPayload = {
  groupId: string;
};

export type AnalyzeQueryPayload = {
  query?: string;
  filters?: PostHogQueryFilters;
};

export type JobType =
  | "analyze_session"
  | "analyze_user"
  | "analyze_group"
  | "analyze_query";

export type JobPayloadMap = {
  analyze_session: AnalyzeSessionPayload;
  analyze_user: AnalyzeUserPayload;
  analyze_group: AnalyzeGroupPayload;
  analyze_query: AnalyzeQueryPayload;
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
