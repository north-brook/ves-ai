# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
bun i

# Development
bun run dev          # Start Next.js dev server with Turbopack on localhost:3000
bun run email        # Start email preview server on port 5000

# Database
supabase start       # Start local Supabase instance
supabase db reset    # Reset and migrate local database
bun run supatype     # Generate TypeScript types from Supabase schema

# Testing & Quality
bun run test         # Run Playwright tests
bun run lint         # Run Next.js linting
bunx playwright test --ui  # Run tests with UI

# Build & Production
bun run build        # Build for production
bun run start        # Start production server

# Environment Setup
vercel env pull      # Pull environment variables from Vercel
```

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Styling**: Tailwind CSS v4 with CSS-in-JS
- **AI/ML**: OpenAI SDK, Google Gemini, AI SDK for session analysis
- **Integrations**: PostHog (analytics), Linear SDK (ticketing), Sentry (monitoring)
- **Storage**: Google Cloud Storage for video processing
- **Authentication**: Supabase Auth with Google OAuth
- **Job Orchestration**: Vercel Workflow for durable, long-running jobs

### Project Structure

**App Directory (Next.js App Router)**

- `app/(marketing)/` - Public landing pages (login, pricing, terms, privacy)
- `app/(onboarding)/` - User onboarding flow for new projects
- `app/(platform)/` - Main authenticated application
  - `[project]/` - Project-specific pages with dynamic routing
  - `[project]/sessions/[session]/` - Individual session analysis views
- `app/auth/` - Authentication routes and callbacks
- `app/api/` - API endpoints

**Workflows Directory**

- `workflows/sync/` - Sync workflow (pulls recordings from PostHog)
- `workflows/analysis/` - Analysis workflow (processes individual sessions)

**Cloud Service**

- `cloud/` - Separate Node.js service for video processing
- Converts PostHog recordings to WebM videos using Playwright/Chromium
- Deployed to Google Cloud Run, uploads to GCS bucket

**Key Files**

- `types.ts` - Main TypeScript type definitions extending Supabase types
- `schema.ts` - Generated Supabase database types
- `supabase/migrations/` - Database migration files

### Data Flow

The system uses two separate workflows:

1. **Sync Workflow** (`workflows/sync/`): Cron (every 30 min) or user visit → `/api/sync` → `sync()` → pulls recordings → kicks off analysis workflows
2. **Analysis Workflow** (`workflows/analysis/`): `analysis(sessionId)` → processes individual session
   - **Video Processing**: Cloud service → WebM video → GCS storage → Webhook callback
   - **AI Analysis**: Session events + video → Gemini/OpenAI → Session story, issues, insights
3. **Real-time Updates**: Supabase real-time → UI updates

### Vercel Workflow Pattern

The codebase uses [**Vercel Workflow**](https://useworkflow.dev) for durable job orchestration. Workflows survive server restarts, provide step-level retries, and offer full observability.

**Key Directives:**
- `"use workflow"` - Marks the workflow entry point (root function)
- `"use step"` - Marks individual steps that can retry independently

**Two Workflows:**

1. **Sync Workflow** (`workflows/sync/index.ts`) - Pulls recordings from PostHog
   - **pullGroups** - Fetches group data from PostHog
   - **pullRecordings** - Pulls new session recordings (paginated)
   - **processRecording** - Creates session/user/group records
   - **kickoff** - Starts analysis workflow for each session
   - **finish** - Updates sync timestamp

2. **Analysis Workflow** (`workflows/analysis/index.ts`) - Processes individual sessions
   - **processReplay** - Triggers cloud service, waits for webhook callback
     - Uses `createWebhook()` to get webhook URL
     - Cloud service POSTs video data to webhook URL
     - Webhook promise resolves with video data
   - **analyzeSession** - AI analyzes video and events (Gemini 2.5 Pro with extended thinking)
   - **analyzeUser** / **analyzeGroup** - Aggregate user/group insights (sequential)
   - **reconcileIssues** - Deduplicates issues using Gemini 2.5 Pro with extended thinking
   - **analyzeIssue** - Analyzes each issue (runs in parallel)
   - **next** - Kicks off workflow for next pending session

**Workflow APIs:**
- `start(workflow, args)` - Initiates new workflow
- `createWebhook()` - Creates webhook URL for async callbacks (returns promise that resolves with Request)
- `sleep(duration)` - Pauses execution with timeout protection
- `FatalError` - Throws non-retryable errors

**Sync Triggers:**
- Cron job every 30 minutes OR user visiting platform
- Triggers `/api/sync` which pulls new sessions from PostHog
- Calls `kickoff(projectId)` to start sync workflows
- Respects worker limits and usage limits per project plan

### Key Integrations

**PostHog Integration**

- Session replay data fetched via PostHog API
- Requires API key with recording read access
- Synced every 30 minutes via cron job

**Linear Integration**

- OAuth flow in `/app/(onboarding)/[project]/linear/`
- Users can manually create tickets from issues
- Tickets include AI-generated descriptions and links to session replays

**Google Cloud Storage**

- Videos stored in `ves.ai` bucket
- Requires service account credentials
- Public read access for video playback

### Database Schema

Key tables:

- `users` - User accounts
- `projects` - Customer projects with plan tiers
- `sessions` - Analyzed session data with observations
- `sources` - PostHog integration configs
- `destinations` - Linear integration configs
- `issues` - Recommended fixes / improvements to the product
- `roles` - User permissions per project

### Testing Approach

- Playwright for E2E tests in `/tests/`
- Test configuration in `playwright.config.ts`
- Focus on critical user flows (session replay viewing)
- No unit test framework configured

### Development Notes

- Uses Turbopack for faster development builds
- Path alias `@/` maps to project root
- Sentry configured for error monitoring
- PostHog proxy configured to bypass ad blockers
- Real-time features use Supabase subscriptions
- Video processing is async via Cloud Run service
- Vercel Workflow enabled via `withWorkflow()` wrapper in `next.config.ts`
- All workflow jobs use `"use workflow"` and `"use step"` directives
- Workflows are durable and survive server restarts

### Styling

- Uses tailwind `slate` color theme
- `text-slate-800 dark:text-slate-200` for headings
- `border-slate-200 dark:border-slate-800` for borders
