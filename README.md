# VES AI

VES AI is open source, self-hosted, and local-first.

The default product is a terminal experience with:
- CLI quickstart wizard
- Synchronous replay analysis commands
- Local daemon for rendering + inference execution
- Local markdown workspace under `~/.vesai/workspace`

## Install

```bash
curl -fsSL https://ves.ai/install | bash
```

This installer:
1. Clones the repo to `~/.vesai/app/vesai`
2. Installs dependencies
3. Installs Playwright Chromium
4. Links `vesai` to `~/.local/bin/vesai`
5. Starts `vesai quickstart`

## Prerequisites

- `git`
- `gcloud`
- `ffmpeg`
- `bun`

Before running quickstart:

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project <project-id>
```

If `gcloud` prints `unsupported hash type blake2b/blake2s`, pin Cloud SDK to system Python:

```bash
export CLOUDSDK_PYTHON=/usr/bin/python3
```

## Quickstart

```bash
vesai quickstart
```

For power users and automation:

```bash
vesai quickstart --help
vesai quickstart --non-interactive --posthog-api-key phx_... --posthog-project-id 123 --posthog-group-key company_id --domain-filter app.example.com --product-description "B2B SaaS for..."
```

Quickstart collects and provisions:
- PostHog API key (User API key with `All access + MCP server scope`)
- PostHog project selection
- PostHog group key
- Domain filter for replay inclusion
- Vertex AI location
- GCS bucket + bucket location
- Render concurrency (default is RAM-aware: ~50% of currently available RAM at ~512MB per renderer)
- Analysis parallelism is not hard-capped by quickstart defaults
- Product description context

Config is saved to `~/.vesai/vesai.json`.

Create your PostHog key at `https://app.posthog.com/settings/user-api-keys`.

## Daemon

Start daemon in background:

```bash
vesai daemon start
```

Run daemon in foreground (stops on Ctrl+C or shell exit):

```bash
vesai daemon watch
```

Check daemon status:

```bash
vesai daemon status
```

Stop daemon:

```bash
vesai daemon stop
```

## Replays Flows

Run synchronous replay analysis:

```bash
vesai replays session <session_id>
vesai replays user <email>
vesai replays group <group_id>
vesai replays query "<text>"
vesai replays list --limit 50
```

Powerful replay filter examples:

```bash
vesai replays query "checkout friction" --from 2026-01-01 --to 2026-01-31
vesai replays query --email user@example.com --min-active 30 --url /checkout
vesai replays query --group acme --group-key company_id --where plan=enterprise
vesai replays query --session-contains ph_ --limit 25
```

Use `vesai replays query --help` for the full filter set.

`vesai replays user`, `vesai replays group`, and `vesai replays query` show progressive terminal progress with estimated completion time based on concurrency and session durations.

## Analytics Flows

PostHog MCP-style analytics from CLI:

```bash
vesai events --search checkout
vesai properties --type event --event-name '$pageview'
vesai schema data checkout
vesai schema warehouse
vesai insights hogql "weekly active users by plan"
vesai insights sql "SELECT event, count() FROM events GROUP BY event LIMIT 20"
vesai insights run --hogql "SELECT distinct_id, count() FROM events GROUP BY distinct_id LIMIT 10"
vesai errors list
vesai logs query --from 2026-01-01T00:00:00Z --to 2026-01-02T00:00:00Z --severity error
```

## User Analysis Contract

`vesai replays user <email>` performs:
1. Find all matching user sessions in PostHog
2. Ensure every session is rendered to video and uploaded
3. Analyze each session individually
4. Run a single aggregate Gemini inference with all session analyses + metadata
5. Write comprehensive user markdown output

## Filesystem Layout

```text
~/.vesai/
  vesai.json
  jobs/
  cache/
  logs/
  tmp/
  workspace/
    sessions/
    users/
    groups/
  app/
    vesai/
```

`workspace` is git-ready and optimized for human-readable markdown diffs.

## Local Development

```bash
bun install
bunx playwright install chromium
bun run lint
bun run typecheck
bun run vesai -- --help
```

Run the marketing website (Next.js App Router + Tailwind):

```bash
bun run website:dev
```

Build the website:

```bash
bun run website:build
```

Run tests:

```bash
bun test
bun run test:coverage
```

Git hooks:

- Husky is enabled via `prepare` on install.
- Pre-commit runs `bun run precommit` (`lint`, `typecheck`, `test`).
