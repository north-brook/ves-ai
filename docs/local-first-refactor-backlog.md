# VESAI Local-First Refactor Backlog

Status: planned  
Scope: complete refactor, no backward compatibility, no legacy hosted paths

## Product Definition

- Local-first and self-hosted by default.
- One-line install from `ves.ai/install`.
- First run starts CLI quickstart wizard.
- No auto-watch of all sessions.
- Analysis is explicit and job-based:
  - `vesai analyze session <session_id>`
  - `vesai analyze user <email>`
  - `vesai analyze group <group_id>`
  - `vesai analyze query "<criteria>"`
  - `vesai job <job_id>`
- User analysis must render all user sessions first, then make one aggregate Gemini call for a comprehensive user story.
- All GCP setup is via local `gcloud` CLI.

## Target Filesystem Contract

- `~/.vesai/vesai.json`
- `~/.vesai/workspace/`
- `~/.vesai/workspace/sessions/`
- `~/.vesai/workspace/users/`
- `~/.vesai/workspace/groups/`
- `~/.vesai/jobs/`
- `~/.vesai/cache/`
- `~/.vesai/logs/`
- `~/.vesai/tmp/`
- `~/.vesai/app/vesai/` (installed repo clone path)

## Epic 1: Repository Restructure

Goal: move from Next.js SaaS app layout to CLI + local daemon architecture.

1. `E1-T1` Create top-level runtime/packages layout:
   - `cli`
   - `daemon`
   - `packages/core`
   - `packages/connectors`
   - `packages/config`
   - `packages/workspace`
2. `E1-T2` Add root workspace tooling and scripts for multi-package development.
3. `E1-T3` Mark hosted web app paths deprecated for removal from active runtime:
   - `app/`
   - `workflows/`
   - `cloud/`
4. `E1-T4` Add `docs/architecture-local-first.md` with module boundaries.

Acceptance criteria:
- New packages build and run with local commands.
- No production-critical path depends on `next` runtime.

## Epic 2: Config + Local State Foundation

Goal: establish strict local config/state contract under `~/.vesai`.

1. `E2-T1` Implement config schema and validation in `packages/config`.
2. `E2-T2` Create config read/write manager for `~/.vesai/vesai.json`.
3. `E2-T3` Create filesystem bootstrap for required dirs.
4. `E2-T4` Add encrypted-at-rest option for sensitive keys.
5. `E2-T5` Add `vesai config` command family:
   - `vesai config show`
   - `vesai config validate`
   - `vesai config set <key> <value>`

Acceptance criteria:
- `vesai config validate` passes on a fresh machine after quickstart.
- Missing/invalid keys produce actionable errors.

## Epic 3: One-Liner Installer

Goal: `curl https://ves.ai/install | bash` performs full bootstrap.

1. `E3-T1` Build install script endpoint content and version pinning strategy.
2. `E3-T2` Installer checks prerequisites:
   - `git`
   - `gcloud`
   - `bun`
   - `ffmpeg`
3. `E3-T3` Clone repo to `~/.vesai/app/vesai`.
4. `E3-T4` Install dependencies and build CLI binary/entrypoint.
5. `E3-T5` Run `vesai quickstart` automatically.
6. `E3-T6` Add checksum verification and rollback on partial install.

Acceptance criteria:
- Fresh machine can run one command and land in quickstart.
- Installer is idempotent on rerun.

## Epic 4: GCloud-First Quickstart (CLI)

Goal: interactive onboarding that uses `gcloud` for all cloud provisioning.

1. `E4-T1` Preflight checks:
   - authenticated account exists (`gcloud auth list`)
   - active project set (`gcloud config get-value project`)
2. `E4-T2` Enable required APIs via `gcloud services enable`:
   - `aiplatform.googleapis.com`
   - `storage.googleapis.com`
3. `E4-T3` Create/select bucket via `gcloud storage`.
4. `E4-T4` Validate Vertex AI access, region, and selected model (Gemini 3 Pro target).
5. `E4-T5` Collect and validate PostHog settings:
   - API key
   - project selection
   - group key
   - domain filter
6. `E4-T6` Collect concurrency/resource limits.
7. `E4-T7` Collect product description context used in analysis prompts.
8. `E4-T8` Persist all settings in `~/.vesai/vesai.json`.

Acceptance criteria:
- Quickstart fails fast if `gcloud` auth/project is missing.
- Successful quickstart leaves a fully valid config and writable workspace.

## Epic 5: Core Analysis Engine Extraction

Goal: move reusable logic into local runtime packages.

1. `E5-T1` Port analysis logic from `workflows/analysis/*` to `packages/core`.
2. `E5-T2` Port PostHog retrieval and filtering logic from `workflows/sync/*` to `packages/connectors/posthog`.
3. `E5-T3` Port render orchestration from `cloud/src/*` into local services.
4. `E5-T4` Port prompt/context builders from:
   - `workflows/analysis/analyze-session/prompts.ts`
   - `workflows/analysis/analyze-user/prompts.ts`
   - `workflows/analysis/analyze-group/prompts.ts`
5. `E5-T5` Remove Next.js and Vercel workflow package dependencies from core path.

Acceptance criteria:
- Core engine can run end-to-end without importing `app/` or `workflow`.

## Epic 6: Local Daemon + Job System

Goal: async local execution with explicit polling commands.

1. `E6-T1` Implement local job queue and persistence in `~/.vesai/jobs`.
2. `E6-T2` Implement daemon process with worker pool and configurable concurrency.
3. `E6-T3` Implement job states:
   - `queued`
   - `running`
   - `complete`
   - `failed`
4. `E6-T4` Add `vesai daemon` lifecycle commands:
   - `vesai daemon start`
   - `vesai daemon status`
   - `vesai daemon stop`
5. `E6-T5` Add `vesai job <job_id>` and `vesai jobs`.
6. `E6-T6` Add retry policy and resumability for interrupted jobs.

Acceptance criteria:
- Analyze commands return job ids immediately.
- Job status can be polled until completion with stable output.

## Epic 7: Replay Rendering Pipeline

Goal: guaranteed replay video artifact flow before aggregate analyses.

1. `E7-T1` Implement replay-id to video render pipeline locally.
2. `E7-T2` Upload rendered videos to configured GCS bucket.
3. `E7-T3` Persist artifact metadata (URI, timestamps, checksum, duration).
4. `E7-T4` Cache rendered artifacts to avoid duplicate work.
5. `E7-T5` Harden failure handling and retries.

Acceptance criteria:
- Any session analysis can resolve a valid video artifact URI.
- Re-running analysis does not re-render unchanged sessions.

## Epic 8: Analyze Flows (CLI)

Goal: entity-based on-demand analysis experience.

1. `E8-T1` `vesai analyze session <session_id>` flow.
2. `E8-T2` `vesai analyze group <group_id>` flow.
3. `E8-T3` `vesai analyze query "<criteria>"` flow.
4. `E8-T4` `vesai analyze user <email>` orchestration:
   - resolve all sessions for user
   - ensure all sessions have rendered videos
   - perform one aggregate Gemini call with all sessions + metadata
   - write comprehensive user story file
5. `E8-T5` Return concise job summary with polling instruction.

Acceptance criteria:
- User analyze flow always produces one aggregate user story artifact.
- Aggregate call input includes all user sessions in scope.

## Epic 9: Workspace Markdown Writer

Goal: clean, deterministic knowledge base in local git-ready workspace.

1. `E9-T1` Define frontmatter schema for sessions.
2. `E9-T2` Define frontmatter schema for users.
3. `E9-T3` Define frontmatter schema for groups.
4. `E9-T4` Implement deterministic slug/filename strategy.
5. `E9-T5` Implement upsert writer and conflict-safe updates.

Acceptance criteria:
- Files are stable between runs when source data has not changed.
- Git diffs are minimal and human-readable.

## Epic 10: CLI UX

Goal: high-quality command-line UX with discoverable help and strong ergonomics.

1. `E10-T1` Expand `--help` output with examples for each command.
2. `E10-T2` Build guided quickstart prompts and validation loops.
3. `E10-T3` Improve job monitoring output with progress and failures.
4. `E10-T4` Add richer filter and analysis options for user/group/session/query.
5. `E10-T5` Add concise troubleshooting hints in command error output.
6. `E10-T6` Add clear empty/error states with recovery instructions.

Acceptance criteria:
- New user can complete quickstart and run first analysis without docs.
- CLI supports all required analyze flows and job polling.

## Epic 11: Marketing Site + Docs

Goal: install-first open source positioning.

1. `E11-T1` Replace marketing content with open-source local-first messaging.
2. `E11-T2` Add install page centered on `curl .../install | bash`.
3. `E11-T3` Add GitHub stars badge for `github.com/north-brook/vesai`.
4. `E11-T4` Add docs:
   - quickstart
   - gcloud prerequisites
   - CLI usage
   - troubleshooting

Acceptance criteria:
- Website communicates value and setup clearly in under 2 minutes.

## Epic 12: Deletion and Hard Cut

Goal: fully remove legacy hosted/SaaS offering paths.

1. `E12-T1` Remove Stripe billing routes and settings surfaces.
2. `E12-T2` Remove hosted telemetry and SaaS-only instrumentation defaults.
3. `E12-T3` Remove Vercel cron/workflow runtime coupling.
4. `E12-T4` Remove obsolete onboarding and multi-tenant web dashboard code.
5. `E12-T5` Update `README.md` to reflect only the new offering.

Acceptance criteria:
- Default product is exclusively local-first OSS flow.
- No required runtime dependency on Vercel/Stripe/Sentry/PostHog SaaS instrumentation.

## Milestones

1. `M1` Installer + quickstart + config baseline (`E1-E4`)
2. `M2` Daemon/jobs + render pipeline (`E5-E7`)
3. `M3` Analyze flows + markdown workspace (`E8-E9`)
4. `M4` CLI UX polish + marketing/docs + hard deletion (`E10-E12`)

## Definition of Done

1. Fresh machine: `curl https://ves.ai/install | bash` succeeds.
2. Quickstart provisions GCP resources through `gcloud`.
3. `vesai analyze user <email>` returns job id, processes all sessions, generates one comprehensive user story.
4. Markdown artifacts exist in `~/.vesai/workspace/{sessions,users,groups}` with valid frontmatter.
5. Product works without hosted legacy infrastructure.
