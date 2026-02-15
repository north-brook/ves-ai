---
name: vesai
description: Power-user guide for VES AI CLI. Use for replay analysis, PostHog analytics querying, HogQL authoring, and troubleshooting local-first PostHog/GCP workflows.
---

# VES AI Skill

Use VES AI as a local-first CLI for AI-ready product analytics.

## Core Objective

Make product analytics actionable for AI agents by:
1. Discovering high-signal replay sessions.
2. Running replay analysis for session/user/group/query scopes.
3. Pulling supporting evidence from events, schema, insights, errors, and logs.
4. Producing machine-readable outputs (JSON default) and durable workspace artifacts.

## Fast Environment Check

Run before any investigation:

```bash
vesai doctor
vesai config validate
```

If config is missing:

```bash
vesai quickstart
```

Quickstart prerequisites:

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project <project-id>
```

PostHog key requirements:
- User API key from `https://app.posthog.com/settings/user-api-keys`
- Scope: `All access + MCP server scope`

## Command Map

Replay intelligence:

```bash
vesai replays session <session-id>
vesai replays user <email>
vesai replays group <group-id>
vesai replays query [text] [filters]
vesai replays list [text] [filters]
```

Analytics intelligence:

```bash
vesai events
vesai properties
vesai schema data
vesai insights hogql
vesai insights sql
vesai errors list
vesai errors details
vesai logs query
vesai logs attributes
vesai logs values
```

Config and runtime:

```bash
vesai config show
vesai config set <path> <value>
vesai daemon start|watch|status|stop
```

## High-Signal Investigation Workflows

### Workflow 1: Replay-first triage

```bash
vesai replays list "checkout" --url /checkout --min-active 30 --limit 25
vesai replays query "checkout" --url /checkout --min-active 30 --dry-run
vesai replays query "checkout" --url /checkout --min-active 30
```

### Workflow 2: Deep user story

```bash
vesai replays list --email user@example.com --limit 20
vesai replays user user@example.com
```

`vesai replays user` contract:
1. Resolve all user sessions.
2. Render each session.
3. Analyze each session.
4. Run one aggregate user inference using all sessions + metadata.

### Workflow 3: Group diagnosis + supporting analytics

```bash
vesai replays group acme
vesai insights sql "SELECT event, count() AS c FROM events GROUP BY event ORDER BY c DESC LIMIT 20"
vesai errors list --status active
```

## Replay Query Strategy

`vesai replays query "<text>"` is literal metadata text matching, not semantic understanding.

Use structured filters to make intent explicit:
- `--url /checkout`
- `--email user@example.com`
- `--group acme --group-key organization`
- `--where plan=enterprise`
- `--from <iso> --to <iso>`
- `--min-active 30`
- `--limit 50`

Always run `--dry-run` before expensive replay runs when scope is unclear.

## HogQL Power-User Guide

### How to work

1. Use `vesai insights hogql "<question>"` to get a generated starting query.
2. Refine with `vesai insights sql "<query>"` for deterministic iteration.
3. Use `vesai schema data --kind events` and `vesai properties ...` to verify field names before complex queries.
4. Keep queries paginated. PostHog MCP SQL results are capped at 100 rows.

### Reliable query patterns

Top events:

```bash
vesai insights sql "SELECT event, count() AS c FROM events GROUP BY event ORDER BY c DESC LIMIT 20"
```

Daily activity trend (last 7 days):

```bash
vesai insights sql "SELECT toDate(timestamp) AS day, count() AS c FROM events WHERE timestamp >= now() - INTERVAL 7 DAY GROUP BY day ORDER BY day ASC LIMIT 100"
```

Top pageview URLs:

```bash
vesai insights sql "SELECT properties.\$current_url AS url, count() AS c FROM events WHERE event = '\$pageview' GROUP BY url ORDER BY c DESC LIMIT 20"
```

Enterprise segment example:

```bash
vesai insights sql "SELECT event, count() AS c FROM events WHERE person.properties.plan = 'enterprise' GROUP BY event ORDER BY c DESC LIMIT 20"
```

### Key HogQL context for agents

- Base event table is typically `events`.
- Common columns: `event`, `timestamp`, `distinct_id`.
- Event properties are commonly referenced via `properties.<property_key>` (example: `properties.$current_url`).
- Person properties are commonly referenced via `person.properties.<property_key>` (example: `person.properties.email`).
- When passing queries in double quotes, escape `$` as `\$` in shell strings.
- Use `LIMIT` and `OFFSET` to paginate if you need more than 100 rows.
- Use `--raw` on `insights sql` and `insights hogql` when debugging raw PostHog payloads.

## Agent Output Rules

- JSON is default for data commands. Use `--no-json` for human-readable output.
- Treat non-JSON output as operator-facing summaries.
- Log exact command + output for each conclusion.
- If output is empty, test adjacent scopes (wider time range, lower filters, remove `domain` filter) before concluding no signal.

## Artifacts and Paths

- Config: `~/.vesai/vesai.json`
- Workspace markdown:
  - `~/.vesai/workspace/sessions/`
  - `~/.vesai/workspace/users/`
  - `~/.vesai/workspace/groups/`
- Runtime:
  - `~/.vesai/cache/`
  - `~/.vesai/logs/`
  - `~/.vesai/tmp/`

## Troubleshooting

`gcloud` hash errors (`blake2b`, `blake2s`):

```bash
export CLOUDSDK_PYTHON=/usr/bin/python3
```

`storage.objects.create` permission denied (ADC mismatch):

```bash
gcloud auth application-default revoke
gcloud auth application-default login
gcloud auth application-default set-quota-project <project-id>
```

Missing Playwright executable:

```bash
bunx playwright install chromium
```

Vertex model access errors:
- Verify Vertex AI API is enabled.
- Verify model availability in selected region.
- Confirm project permissions and configured model in `vesai.json` (`gemini-3-pro-preview`).

If a schema/analytics tool returns validation errors, fall back to:
1. `events` and `properties` for field discovery.
2. `insights sql` for direct controlled queries.
