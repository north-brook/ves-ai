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

### Project Structure

**App Directory (Next.js App Router)**

- `app/(marketing)/` - Public landing pages (login, pricing, terms, privacy)
- `app/(onboarding)/` - User onboarding flow for new projects
- `app/(platform)/` - Main authenticated application
  - `[project]/` - Project-specific pages with dynamic routing
  - `[project]/sessions/[session]/` - Individual session analysis views
- `app/auth/` - Authentication routes and callbacks
- `app/jobs/` - API endpoints for async processing (analyze, process, run)

**Cloud Service**

- `cloud/` - Separate Node.js service for video processing
- Converts PostHog recordings to WebM videos using Playwright/Chromium
- Deployed to Google Cloud Run, uploads to GCS bucket

**Key Files**

- `types.ts` - Main TypeScript type definitions extending Supabase types
- `schema.ts` - Generated Supabase database types
- `supabase/migrations/` - Database migration files

### Data Flow

1. **Session Ingestion**: PostHog webhooks → `/jobs/process` → Queue processing
2. **Video Processing**: Session data → Cloud service → WebM video → GCS storage
3. **AI Analysis**: Session events → Gemini/OpenAI → Observations & insights
4. **Ticket Creation**: AI observations → Linear API → Actionable tickets
5. **Real-time Updates**: Supabase real-time → UI updates

### Key Integrations

**PostHog Integration**

- Session replay data fetched via PostHog API
- Requires API key with recording read access

**Linear Integration**

- OAuth flow in `/app/(onboarding)/[project]/linear/`
- Creates tickets with AI-generated descriptions
- Links back to session replays

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
