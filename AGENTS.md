# AGENTS.md — VES AI

## What This Is

VES AI is a local-first CLI that makes product analytics actionable for AI agents.
It connects to PostHog (replays, events, errors, logs) and Google Cloud (Vertex AI for analysis, GCS for video storage).

**Core loop:** Discover sessions → Render replays to video → Analyze with Gemini → Produce markdown artifacts.

## Architecture

```
cli/              CLI entrypoint + commands (Commander)
  commands/       Command handlers (replays, events, insights, etc.)
  analysis/       Session/user/group/query analysis orchestration
config/           Config schema + paths (~/.vesai/vesai.json)
connectors/       External integrations (PostHog, GCloud, Gemini, Playwright, shell)
render/           Replay rendering (rrweb → Playwright → video)
daemon/           Background job runner
workspace/        Artifact storage helpers
website/          Marketing site (Next.js 15, Tailwind v3)
legacy-hosted/    Previous hosted SaaS version (archived, not active)
tests/            Bun test suite
scripts/          Build/release scripts
skills/           Agent skills (canonical; symlinked to .agents/skills/)
```

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript (strict)
- **CLI framework:** Commander
- **AI:** Google Vertex AI (Gemini) via @google/genai
- **Replay rendering:** rrweb + Playwright Chromium
- **Analytics source:** PostHog API
- **Storage:** Google Cloud Storage
- **Website:** Next.js 15 + React 19 + Tailwind CSS v3
- **Linting:** Ultracite (Biome) + Husky pre-commit
- **CI:** GitHub Actions (lint + typecheck + test)
- **Testing:** `bun test`

## Development

```bash
bun install
bun run lint        # Ultracite/Biome
bun run typecheck   # tsc --noEmit
bun run test        # bun test
bun run vesai -- --help  # run CLI locally
```

Website:
```bash
bun run website:dev
bun run website:build
```

## Conventions

- JSON output is default for data commands; `--no-json` for human-readable
- Config lives at `~/.vesai/vesai.json`
- Workspace artifacts at `~/.vesai/workspace/`
- `legacy-hosted/` is archived — don't modify unless explicitly asked
- Co-author on commits: `Co-authored-by: Bryce Bjork <brycedbjork@gmail.com>`

## Quality Gates

Pre-commit runs `bun run precommit` (lint + typecheck + test).
CI mirrors the same checks. Don't break them.
