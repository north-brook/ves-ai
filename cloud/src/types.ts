export type RenderRequest = {
  source_type: "posthog";
  source_host: string; // e.g. "https://us.posthog.com"
  source_key: string; // API key with required scopes
  source_project: string; // PostHog project ID
  project_id: string; // The project ID to render
  session_id: string; // The session ID to render
  recording_id: string; // The recording/session ID to render
  active_duration: number; // The active duration of the recording in seconds
  embed_url: string; // The embed URL for the recording (e.g. "https://us.posthog.com/embedded/TOKEN")
  callback: string; // URL to POST result to
};

export type SuccessPayload = {
  success: true;
  recording_id: string;
  url: string;
  video_duration: number;
};

export type ErrorPayload = {
  recording_id: string;
  success: false;
  error: string;
};
