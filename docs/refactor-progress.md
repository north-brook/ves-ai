# Refactor Progress

## Completed

- Local-first runtime skeleton created (`cli`, `daemon`, `packages/*`).
- Config/state contract implemented under `~/.vesai`.
- CLI quickstart wizard implemented with gcloud preflight checks.
- Quickstart provisioning implemented (`gcloud services enable`, bucket create/ensure).
- Daemon lifecycle implemented (`start`, `watch`, `status`, `stop`).
- Synchronous replay flows implemented under `vesai replays` (`session`, `user`, `group`, `query`, `list`).
- User analysis flow enforces per-session analysis before one aggregate user inference.
- Replay rendering pipeline integrated into local daemon (`events -> video -> GCS`).
- PostHog analytics CLI surface expanded (`events`, `properties`, `schema`, `insights`, `errors`, `logs`) based on MCP capabilities.
- Markdown workspace writers implemented for `sessions`, `users`, `groups`.
- Installer scripts added (`install`, `scripts/install.sh`).
- Marketing/install website scaffold added (`website/` Next.js app with App Router + Tailwind).
- Legacy hosted runtime moved to `legacy-hosted/` and removed from active execution paths.
- Bun-only runtime/tooling enforced (CLI scripts, installer, docs, lockfile).
- Bun test suite added with coverage command and high branch coverage for core local-first flows.
- CLI help system expanded with workflow examples and command-specific guidance.
- `vesai replays query` upgraded with structured filtering arguments (email/group/date/url/activity/properties/limit).

## Current Test Baseline

- `bun run test`: passing
- `bun run test:coverage`: passing
- Coverage snapshot: `94.71%` lines, `94.11%` functions across included local-first modules

## Remaining Hardening

- Add integration tests with mock PostHog/GCP responses.
- Add structured logging and richer progress events per job stage.
- Add secure key storage option for sensitive config fields.
- Add release packaging pipeline for prebuilt binaries.
- Publish and host installer endpoint at `https://ves.ai/install`.
