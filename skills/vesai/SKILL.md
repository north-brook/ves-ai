---
name: vesai
description: Operate the VESAI local-first CLI to configure local setup, queue replay analysis jobs, inspect job state, and troubleshoot common PostHog/GCP/Playwright issues. Use when working in this repository or on machines where `vesai` is installed and tasks involve `vesai quickstart`, `vesai analyze ...`, daemon lifecycle, workspace artifacts, or job debugging.
---

# VESAI Skill

Use VESAI through CLI commands only.

## Core Workflow

1. Validate local runtime:

```bash
vesai doctor
```

2. Run setup wizard (interactive):

```bash
vesai quickstart
```

3. Start daemon:

```bash
vesai daemon start
```

4. Queue analysis:

```bash
vesai analyze user user@example.com
vesai analyze group <group_id>
vesai analyze session <session_id>
vesai analyze query "checkout friction" --from 2026-01-01 --to 2026-01-31
```

5. Poll status:

```bash
vesai jobs
vesai job <job_id>
```

## Quickstart (Automation)

Use non-interactive setup in scripts:

```bash
vesai quickstart \
  --non-interactive \
  --posthog-api-key phx_... \
  --posthog-project-id 123 \
  --posthog-group-key company_id \
  --domain-filter app.example.com \
  --product-description "B2B SaaS for ..."
```

Show all quickstart flags:

```bash
vesai quickstart --help
```

## Query Analysis Patterns

Use text plus structured filters:

```bash
vesai analyze query "checkout friction" --email user@example.com --min-active 45 --url /checkout
vesai analyze query --group acme --group-key company_id --where plan=enterprise
vesai analyze query --session-contains ph_ --limit 25
```

Use full filter help:

```bash
vesai analyze query --help
```

## Operational Facts

- Config file: `~/.vesai/vesai.json`
- Markdown outputs:
  - `~/.vesai/workspace/sessions/`
  - `~/.vesai/workspace/users/`
  - `~/.vesai/workspace/groups/`
- Job files: `~/.vesai/jobs/*.json`
- Render concurrency is limited by `runtime.maxConcurrentRenders` in config.
- Analysis parallelism is not hard-capped by quickstart defaults.

## Troubleshooting

- If `gcloud` shows `unsupported hash type blake2b`:

```bash
export CLOUDSDK_PYTHON=/usr/bin/python3
```

- If job fails with `storage.objects.create` denied:
  - Verify ADC identity, not just active `gcloud auth list` account.
  - Re-run:

```bash
gcloud auth application-default revoke
gcloud auth application-default login
gcloud auth application-default set-quota-project <project-id>
```

- If job fails with missing Playwright executable:

```bash
bunx playwright install chromium
```

- If bucket creation fails due invalid location:
  - Use `US`, `EU`, `ASIA`, or a valid regional location (for example `us-central1`).

## Expectations for Agent Runs

- Run `vesai doctor` before changing runtime config.
- Prefer explicit CLI commands over direct file edits for setup.
- Report exact job ids and statuses after queueing work.
- When debugging failures, inspect `vesai job <job_id>` first, then fix root cause and re-queue a new job.
