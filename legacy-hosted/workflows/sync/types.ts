import { Json } from "@/schema";

export type PostHogRecording = {
  id: string;
  distinct_id: string;
  viewed: boolean;
  recording_duration: number;
  active_seconds: number;
  inactive_seconds: number;
  start_time: string;
  end_time: string;
  click_count: number;
  keypress_count: number;
  mouse_activity_count: number;
  console_log_count: number;
  console_warn_count: number;
  console_error_count: number;
  start_url: string;
  person: {
    id: string;
    name: string;
    distinct_ids: string[];
    properties: Record<string, unknown> | null;
    created_at: string;
    uuid: string;
  } | null;
  storage: string;
  snapshot_source: string;
  ongoing: boolean;
  activity_score: number;
};

export type PostHogRecordingsResponse = {
  results: PostHogRecording[];
  has_next: boolean;
};

export type GroupNames = Record<string, string>;
export type GroupProperties = Record<string, Json>;
