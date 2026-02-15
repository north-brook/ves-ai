# VES AI

VES AI is a local-first session replay analysis runtime for agent workflows.

## Install

```bash
curl -fsSL https://ves.ai/install | bash
```

The installer clones VES AI to `~/.vesai/app/vesai`, installs dependencies, links `vesai`, and runs `vesai quickstart`.

## Auto Update

Every `vesai` command syncs the installed CLI with the latest `origin/main` before execution.

## Prerequisites

- `git`
- `bun`
- `gcloud`
- `ffmpeg`

Before `quickstart`:

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project <project-id>
```

## Setup Model

VES AI now has two setup steps:

1. `vesai quickstart` configures global machine-level runtime.
2. `vesai init` configures the current repository as a VES AI project.

### 1) Global setup (`vesai quickstart`)

```bash
vesai quickstart
```

This sets:
- Global Google Cloud + Vertex config
- Global bucket config for rendered artifacts
- Global machine render memory budget (`runtime.maxRenderMemoryMb`)
- Local render runtime dependencies (Chromium)

Render services scale dynamically up/down based on current free RAM, capped by your configured memory budget.

Example:

```bash
vesai quickstart --max-render-memory-mb 8192
```

Global config is stored in `~/.vesai/core.json`.

### 2) Project setup (`vesai init`)

Run this inside your product repo:

```bash
vesai init
```

This creates and configures project-local artifacts:
- `.vesai/project.json`
- `.vesai/workspace/{sessions,users,groups,research}`
- `.vesai/jobs`, `.vesai/cache`, `.vesai/logs`

`vesai init` also:
- Generates a UUID `projectId` by default (or uses `--project-id`)
- Prompts for PostHog project settings
- Prompts for `lookbackDays` (default `180`)
- Adds `.vesai/` to repository `.gitignore`
- Throws a descriptive error if `.gitignore` cannot be updated (locked/read-only)

Example:

```bash
vesai init --lookback-days 180
```

## CLI Surface

```bash
vesai user <useremail>
vesai group <group_id>
vesai research "<question>"

vesai daemon start
vesai daemon watch
vesai daemon status
vesai daemon stop

vesai quickstart
vesai init
vesai config show
vesai doctor
```

Data commands return JSON by default. Use `--no-json` for readable text.

Examples:

```bash
vesai user bryce@company.com
vesai group acme-co
vesai research "What drives checkout abandonment?"
```

## Command Behavior

### `vesai user <useremail>`
- Finds all sessions for the user
- Ensures those sessions are rendered and analyzed
- Produces one aggregate user story

### `vesai group <group_id>`
- Resolves users under the group ID (PostHog group key mapping)
- Builds each user story from all their sessions
- Produces one aggregate group story

### `vesai research "<question>"`
- Uses only already analyzed sessions in `.vesai/workspace/sessions`
- Selects relevant sessions as context
- Sends context to Gemini and returns a research answer

## Daemon Model

`vesai daemon` is project-scoped and runs against the current repo’s `.vesai` directory.

Behavior:
- First run performs backfill from `now - lookbackDays` to now.
- Heartbeat then continuously pulls sessions from `lastPulledAt` to now.
- New sessions are queued for render + analysis.
- After session jobs complete, affected user and group stories are re-run.

## Global vs Project Separation

### Global core (`~/.vesai`)
- Machine-level memory budget (`maxRenderMemoryMb`)
- Render service/runtime dependencies
- GCloud bucket/project/model settings
- Shared cross-process render slot locks (`~/.vesai/render-locks`)

### Project-local (`<repo>/.vesai`)
- Project UUID
- PostHog API key/project/domain/group config
- Session/user/group/research markdown artifacts
- Daemon state, job queue, cache, logs

## Storage Layout in GCS

Rendered artifacts are prefixed by VES AI project UUID:

- `projects/<project-uuid>/events/<session-id>.json`
- `projects/<project-uuid>/videos/<session-id>.webm`

This keeps all project artifacts isolated under top-level project folders in one bucket.

## Config Commands

```bash
vesai config show
vesai config validate
vesai config set core.runtime.maxRenderMemoryMb 8192
vesai config set project.daemon.lookbackDays 180
```

Use `core.` paths for global config and `project.` paths for repo-local config.

## Development

```bash
bun install
bun run lint
bun run typecheck
bun run test
```
