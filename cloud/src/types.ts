export type RenderRequest = {
  source_type: "posthog";
  source_host: string; // e.g. "https://us.posthog.com"
  source_key: string; // API key with required scopes
  source_project: string; // PostHog project ID
  recording_id: string; // The recording/session ID to render
  embed_url: string; // The embed URL for the recording (e.g. "https://us.posthog.com/embedded/TOKEN")

  supabase_url: string;
  supabase_storage_url: string;
  supabase_service_role_key: string;
  supabase_bucket: string;
  supabase_file_path: string; // e.g. "replays/abc123.webm"

  callback: string; // URL to POST result to
};

export type SuccessPayload = {
  success: true;
  recording_id: string;
  public_url: string;
  duration_seconds: number;
};

export type ErrorPayload = {
  recording_id: string;
  success: false;
  error: string;
};
