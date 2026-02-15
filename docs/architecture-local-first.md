# Architecture: Local-First VESAI

## Runtime Components

- `cli`: command-line entrypoint and CLI quickstart wizard.
- `daemon`: long-running local worker runtime.
- `packages/config`: `~/.vesai` pathing, config schema, persistence.
- `packages/connectors`: PostHog, Vertex/Gemini, gcloud shell integrations.
- `packages/core`: job queue, daemon loop, analysis orchestrators, replay render pipeline.
- `packages/workspace`: markdown writer for sessions/users/groups.

## Data Flow

1. User queues job with `vesai analyze ...`.
2. Job record is written to `~/.vesai/jobs/<job>.json` with `queued` status.
3. Daemon picks queued jobs and transitions status to `running`.
4. For session rendering:
   - Pull PostHog replay snapshots.
   - Build replay event payload.
   - Render `.webm` locally via Playwright + ffmpeg.
   - Upload artifacts to GCS bucket.
5. For analysis:
   - Session analysis from replay video.
   - User analysis: all session analyses + metadata in one aggregate inference.
   - Group analysis: aggregate from analyzed users.
6. Markdown artifacts are written to `~/.vesai/workspace/*`.
7. Job status updates to `complete` or `failed`.

## Operational Model

- No background auto-watch of all sessions.
- Everything is explicit and command-driven.
- Cloud resources are user-owned (PostHog + GCP).
- Local machine executes orchestration and rendering.
