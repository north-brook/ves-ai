export type ProcessReplayRequest = {
  source_type: "posthog";
  source_host: string; // e.g. "https://us.posthog.com"
  source_key: string; // API key with required scopes
  source_project: string; // PostHog project ID
  external_id: string; // The recording/session ID to render
  active_duration: number; // The active duration of the recording in seconds
  project_id: string; // The project ID to render
  session_id: string; // The session ID to render
  callback?: string | null; // URL to POST final result to
};

export type ReplaySuccess = {
  success: true;
  external_id: string;
  video_uri: string;
  video_duration: number;
  events_uri: string;
};

export type ReplayError = {
  external_id: string;
  success: false;
  error: string;
};
