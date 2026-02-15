# Local Setup

## 1) Install

```bash
curl -fsSL https://ves.ai/install | bash
```

If installing manually from source, run:

```bash
bun install
bunx playwright install chromium
```

## 2) Authenticate gcloud

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project <project-id>
```

If `gcloud` logs `unsupported hash type blake2b` or `blake2s`, run:

```bash
export CLOUDSDK_PYTHON=/usr/bin/python3
```

## 3) Run quickstart

```bash
vesai quickstart
```

Use `vesai quickstart --help` for all non-interactive flags.

When prompted for PostHog credentials, use a User API key with
`All access + MCP server scope`.
Create one at `https://app.posthog.com/settings/user-api-keys`.

For bucket provisioning, choose a valid GCS bucket location:
`US`, `EU`, `ASIA`, or a valid regional location like `us-central1`.

## 4) Analyze replays synchronously

```bash
vesai replays user you@example.com
```

Use `vesai replays query --help` for advanced replay filters.

## 5) Run analytics commands

```bash
vesai events --search checkout
vesai insights hogql "weekly active users by plan"
vesai insights sql "SELECT event, count() FROM events GROUP BY event LIMIT 20"
```
