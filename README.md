# VES AI

Make product analytics actionable for AI agents.

**Core differentiator:** VES AI closes the product improvement loop by making product analytics data actionable for AI agents.

VES AI is local-first:
- You run the CLI on your machine.
- You use your own PostHog + Google Cloud.
- You keep outputs in `~/.vesai/workspace` as durable, git-friendly artifacts.

## Install

```bash
curl -fsSL https://ves.ai/install | bash
```

Installer flow:
1. Clone/update repo at `~/.vesai/app/vesai`
2. Install dependencies with Bun
3. Install Playwright Chromium
4. Link `vesai` at `~/.local/bin/vesai`
5. Start `vesai quickstart`

## Prerequisites

- `git`
- `bun`
- `gcloud`
- `ffmpeg`

Before quickstart:

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project <project-id>
```

If `gcloud` throws `unsupported hash type blake2b` / `blake2s`:

```bash
export CLOUDSDK_PYTHON=/usr/bin/python3
```

## Quickstart

```bash
vesai quickstart
```

Quickstart configures:
- PostHog host + User API key
- PostHog project selection
- PostHog group key
- Replay domain filter
- GCP project + Vertex region
- GCS bucket create/select
- Render concurrency (defaults to ~50% of available RAM, ~512MB per renderer)
- Product description context for analysis prompts

PostHog API key requirements:
- Key type: User API key
- Scope: `All access + MCP server scope`
- URL: `https://app.posthog.com/settings/user-api-keys`

Non-interactive usage:

```bash
vesai quickstart \
  --non-interactive \
  --posthog-api-key phx_... \
  --posthog-project-id 123 \
  --posthog-group-key organization \
  --domain-filter app.example.com \
  --product-description "B2B SaaS for support teams"
```

## CLI Surface

Replay intelligence:

```bash
vesai replays session <session_id>
vesai replays user <email>
vesai replays group <group_id>
vesai replays query "<text>"
vesai replays list
```

PostHog analytics intelligence:

```bash
vesai events
vesai properties
vesai schema data
vesai schema warehouse
vesai insights hogql "<question>"
vesai insights sql "<query>"
vesai errors list
vesai logs query --from ... --to ...
```

Agent mode patterns:

```bash
vesai replays query --group acme --min-active 30 --dry-run
vesai replays query --group acme --min-active 30
vesai insights sql "SELECT event, count() FROM events GROUP BY event LIMIT 20"
```

JSON is default for data commands. Use `--no-json` for human-readable summaries.

## Replay Querying Notes

`vesai replays query "checkout friction"` is **literal metadata search** plus filters. It does not infer intent from language on its own.

For strong signal, pair text with structured filters:

```bash
vesai replays query "checkout" --url /checkout --min-active 30 --from 2026-02-01 --to 2026-02-15
vesai replays query --group acme --where plan=enterprise --url /checkout
```

## User Analysis Contract

`vesai replays user <email>` does:
1. Find all matching sessions for the user
2. Ensure every session is rendered to video
3. Analyze each session individually
4. Run one aggregate Gemini call across all session analyses + metadata
5. Write comprehensive user story markdown to workspace

## Filesystem Layout

```text
~/.vesai/
  vesai.json
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

## Daemon Commands

```bash
vesai daemon start   # background
vesai daemon watch   # foreground (Ctrl+C to stop)
vesai daemon status
vesai daemon stop
```

## Troubleshooting

### Bucket location errors

If bucket creation fails with invalid location constraint, use a valid location:
- Multi-region: `US`, `EU`, `ASIA`
- Or supported region like `us-central1`

### Permission mismatch (`storage.objects.create` denied)

Common cause: ADC identity differs from `gcloud auth list` active account.

Reset ADC:

```bash
gcloud auth application-default revoke
gcloud auth application-default login
gcloud auth application-default set-quota-project <project-id>
```

### Missing Playwright executable

```bash
bunx playwright install chromium
```

### Vertex model access errors (`gemini-3-pro-preview` not found)

- Verify Vertex AI API is enabled on the selected project
- Verify selected region supports the configured model
- Update config if needed:

```bash
vesai config set vertex.model gemini-3-pro-preview
vesai config set vertex.location us-central1
```

Run `vesai doctor` to confirm local setup state.

## Development

```bash
bun install
bun run lint
bun run typecheck
bun run test
bun run vesai -- --help
```

Website:

```bash
bun run website:dev
bun run website:build
bun run website:start
```

Quality gates:
- Husky pre-commit: `bun run precommit`
- CI: `.github/workflows/ci.yml` runs the same `lint + typecheck + test`
