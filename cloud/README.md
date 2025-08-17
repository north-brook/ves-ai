# PostHog → WebM Renderer (Cloud Run)

This service:

- Enables sharing for a PostHog session recording and obtains an embed token.
- Renders the replay in a headless Chromium inside a full-screen `<iframe>`.
- Records the playback at 1× to WebM (skipping inactivity is handled by PostHog's player).
- Uploads the WebM to Supabase Storage.
- Calls your callback with success/failure.

## Requirements

- **PostHog**: Use a **Personal API Key** with scopes to read recordings and manage sharing. See “Sharing & embedding replays” docs. [oai_citation:4‡PostHog](https://posthog.com/docs/session-replay/sharing)
- **Supabase**: A Storage bucket (public is recommended for permanent URLs). For private buckets, we return a **signed URL** (default 7 days). [oai_citation:5‡Supabase](https://supabase.com/docs/reference/javascript/storage-from-getpublicurl?utm_source=chatgpt.com)
- **Cloud Run**: Set a timeout that covers long replays (e.g. 15 minutes). Consider setting concurrency to a small number, since rendering is CPU-intensive.

## Deploy to Cloud Run

```bash
# Build locally
gcloud auth configure-docker
gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/posthog-replay-renderer

# Deploy
gcloud run deploy posthog-replay-renderer \
  --image gcr.io/$(gcloud config get-value project)/posthog-replay-renderer \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --cpu 2 --memory 2Gi \
  --concurrency 1 \
  --timeout 900
```
