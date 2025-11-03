# VES AI

AI-powered session analysis that watches every user session and identifies bugs, UX issues, and product opportunities.

## Overview

VES AI connects to your PostHog instance to analyze session replays using AI, automatically identifying bugs, UX issues, and product opportunities. Issues can be exported as prioritized, well-documented tickets to Linear.

## Features

- **Automated Session Analysis** - AI watches every PostHog session replay
- **Bug Detection** - Catches errors, broken flows, and technical issues
- **UX Insights** - Identifies friction points and user confusion
- **Linear Integration** - Export issues as detailed tickets with context and replay links
- **Video Processing** - Converts session replays to shareable video format
- **Real-time Dashboard** - View analysis results and metrics

## Getting Started

### Prerequisites

- Node.js 22+
- Supabase CLI
- PostHog account with session recording enabled
- Linear account
- Google Cloud Storage (for video processing)

### Installation

```bash
# Clone the repository
git clone https://github.com/steppable/vesai.git
cd vesai

# Install dependencies
bun i

# Pull .env.local from vercel
vercel env pull

# Add local supabase environment variables to .env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

```bash
# Start Supabase locally
supabase start

# Init the local database
supabase db reset
```

### Development

```bash
# Start the development server
bun run dev

# Start email preview server (in separate terminal)
bun run email

# Open http://localhost:3000
```

## Project Structure

```
vesai/
├── app/                    # Next.js app directory
│   ├── (marketing)/       # Landing pages
│   ├── (onboarding)/      # User onboarding flow
│   ├── (platform)/        # Main application
│   └── api/               # API endpoints
├── workflows/             # Vercel Workflow definitions
│   ├── analysis/          # Session analysis workflow
│   └── sync/              # PostHog sync workflow
├── cloud/                 # Cloud Run service for video processing
├── components/            # Shared React components
├── lib/                   # Utilities and configurations
├── supabase/             # Database migrations
└── tests/                # Playwright tests
```

## Workflow Architecture

VES AI uses [**Vercel Workflow**](https://useworkflow.dev) for durable, long-running job orchestration. Workflows survive server restarts, provide step-level retries, and offer full observability of the session analysis pipeline.

### Data Flow

The system operates using two separate, coordinated workflows:

1. **Sync Workflow** (`/workflows/sync/`)
   - Triggered by cron every 30 minutes OR when user visits the platform
   - Pulls new session recordings from PostHog
   - Creates session, user, and group records in database
   - Kicks off analysis workflows for each new session

2. **Analysis Workflow** (`/workflows/analysis/`)
   - Processes individual session (one workflow per session)
   - Converts replay to video format via cloud service
   - AI analyzes video and events to generate insights
   - Creates and updates issues
   - Chains to next pending session

**Flow Overview:**

```
Cron/User Visit → /api/sync → sync workflow → analysis workflow (per session)
```

### Key Concepts

**Workflow Directives:**

- `"use workflow"` - Marks the entry point of a workflow (the root function)
- `"use step"` - Marks individual steps that can be retried independently

**Workflow APIs:**

- `start(workflow, args)` - Initiates a new workflow instance
- `createWebhook()` - Creates a webhook URL for async callbacks (returns promise that resolves with Request)
- `sleep(duration)` - Pauses workflow execution for a specified duration
- `FatalError` - Throws non-retryable errors that stop workflow execution

### Sync Workflow

The sync workflow pulls new session recordings from PostHog. See [`/workflows/sync/index.ts`](/workflows/sync/index.ts)

**Steps:**

1. **pullGroups** - Fetches organization/group data from PostHog and creates/updates group records
2. **pullRecordings** - Pulls new session recordings since last sync (paginated)
3. **processRecording** - Creates/updates session, user, and group database records
4. **kickoff** - Initiates analysis workflow for the session via `start(analysis, [sessionId])`
5. **finish** - Updates source's `last_synced_at` timestamp

### Analysis Workflow

The analysis workflow processes individual sessions (one workflow per session). See [`/workflows/analysis/index.ts`](/workflows/analysis/index.ts)

### Analysis Workflow Steps

Each step uses the `"use step"` directive, making it independently retryable:

1. **processReplay** - Converts session replay to video format
   - Creates webhook URL via `createWebhook()`
   - Triggers cloud service with webhook URL (fire-and-forget HTTP request)
   - Waits for cloud service to POST video data back to webhook
   - **Status progression**: `pending` → `processing` → `processed`

2. **analyzeSession** - AI-powered session analysis
   - Uses **Google Gemini 2.5 Pro** (via Vertex AI) with extended thinking budget (32,768 tokens)
   - Analyzes video frames and event data to generate session insights
   - Generates: name, story, features used, detected issues, health score
   - Creates embeddings for similarity matching
   - **Status**: `processed` → `analyzing` → `analyzed`

3. **analyzeUser** - Maintains user-level insights
   - Aggregates all sessions for a specific user
   - Uses hash-based caching to skip redundant analysis
   - Generates: user story, health score

4. **analyzeGroup** - Organization-level analysis
   - Aggregates all users within a group/organization
   - Generates: group story, collective usage patterns

5. **reconcileIssues** - Intelligent issue deduplication
   - For each detected issue, finds similar issues via embedding search
   - Uses **Google Gemini 2.5 Pro** with extended thinking budget to decide: merge with existing or create new
   - Returns issue IDs for further analysis

6. **analyzeIssue** - Issue-level analysis (runs in parallel for all issues)
   - Analyzes all sessions linked to an issue
   - Generates: name, story, type, severity, priority, confidence
   - Uses hash-based caching to prevent redundant analysis

7. **next** - Chain processing
   - Kicks off analysis workflow for next pending session
   - Maintains continuous processing throughput

### Workflow Triggers

**Sync Workflow Triggers**

The sync workflow is triggered in two ways:

1. **Cron Job (Every 30 Minutes)** - Configured in `vercel.json`:

   ```json
   {
     "crons": [
       {
         "path": "/api/sync",
         "schedule": "*/30 * * * *"
       }
     ]
   }
   ```

2. **User Visit** - When a user visits the platform, sync is triggered for their project

**Flow:**

1. Trigger hits [`/app/api/sync/route.ts`](/app/api/sync/route.ts)
2. Calls `kickoff()` for each project to start sync workflow
3. Sync workflow pulls recordings from PostHog and kicks off analysis workflows

**Webhook Callbacks**

The cloud video processing service receives a webhook URL from the analysis workflow and POSTs video data back to it when processing is complete. The webhook promise resolves with the video data, allowing the workflow to continue.

### Workflow Coordination

The Vercel Workflow system provides:

- **Durable Execution** - Workflows survive server restarts and infrastructure failures
- **Step-Level Retries** - Each `"use step"` can retry independently on failure
- **Worker Limits** - Projects have concurrent worker limits based on plan tier
- **Hook Pattern** - Elegant async coordination (webhooks resume workflows)
- **Timeout Management** - Built-in `sleep()` for timeout protection
- **Observability** - Full logging and progress tracking for each workflow
- **Parallel Execution** - Native support for concurrent step execution
- **Error Handling** - `FatalError` class for non-retryable failures
- **Hash-Based Caching** - Prevents redundant AI analysis of unchanged data

### Workflow Observability

#### Local

- `bunx workflow inspect runs`
- Use the `--web` flag to open the browser interface

#### Production

- Ensure you have a Vercel auth token from [https://vercel.com/account/settings/tokens](https://vercel.com/account/settings/tokens) set in your environment
- `bunx workflow inspect runs --backend=vercel --env=production --project=vesai --team=steppable`
- Use the `--web` flag to open the browser interface
- Prefix the command with `WORKFLOW_LOCAL_UI=1` to use the local UI

## Available Scripts

- `bun run dev` - Start development server with Turbopack
- `bun run build` - Build for production
- `bun run lint` - Run ESLint
- `bun run test` - Run Playwright tests
- `bun run supatype` - Generate TypeScript types from database
- `bun run email` - Start email preview server

## Cloud Video Processing Service

The `/cloud` directory contains a separate service for converting PostHog recordings to video:

```bash
cd cloud

# Using Docker (recommended)
docker build -t vesai-cloud .
docker run -p 8080:8080 vesai-cloud

# Using Node.js
npm install
npm run build
npm start
```

See [cloud/README.md](cloud/README.md) for detailed setup instructions.

## Testing

```bash
# Run all tests
bun run test

# Run tests with UI
bun playwright test --ui
```

## Deployment

### Vercel (Main App)

The application is configured for automatic deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Cloud Run (Video Service)

The video processing service auto-deploys to Google Cloud Run on push to main branch.

## License

Private repository - All rights reserved
