# VES AI

AI-powered session analysis that watches every user session and automatically creates actionable tickets in Linear.

## Overview

VES AI connects to your PostHog instance to analyze session replays using AI, automatically identifying bugs, UX issues, and product opportunities. It then creates prioritized, well-documented tickets directly in Linear - no manual review needed.

## Features

- **Automated Session Analysis** - AI watches every PostHog session replay
- **Bug Detection** - Catches errors, broken flows, and technical issues
- **UX Insights** - Identifies friction points and user confusion
- **Linear Integration** - Creates detailed tickets with context and replay links
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
│   └── jobs/              # API endpoints for async processing
├── cloud/                 # Cloud Run service for video processing
├── components/            # Shared React components
├── lib/                   # Utilities and configurations
├── supabase/             # Database migrations
└── tests/                # Playwright tests
```

## Workflow Architecture

VES AI uses **Vercel Workflow** for durable, long-running job orchestration. Workflows survive server restarts, provide step-level retries, and offer full observability of the session analysis pipeline.

### Key Concepts

**Workflow Directives:**
- `"use workflow"` - Marks the entry point of a workflow (the root function)
- `"use step"` - Marks individual steps that can be retried independently

**Workflow APIs:**
- `start(workflow, args)` - Initiates a new workflow instance
- `createHook(config)` - Creates a hook that can be resumed by async callbacks
- `resumeHook(token, data)` - Resumes a waiting workflow from webhooks
- `sleep(duration)` - Pauses workflow execution for a specified duration

### Main Workflow Orchestrator

The core workflow is defined in `app/jobs/run.ts` and coordinates the entire session analysis pipeline:

```typescript
export async function run(sessionId: string) {
  "use workflow";  // Durable workflow entry point

  // Step 1: Process replay with timeout protection
  const replayHook = createHook({ token: `session:${sessionId}` });
  await processReplay(sessionId);
  await Promise.race([
    replayHook,  // Wait for cloud service webhook
    async () => {
      await sleep("6 hours");
      throw new Error("Session processing timed out");
    },
  ]);

  // Step 2: Analyze the session with AI
  const { session } = await analyzeSession(sessionId);

  // Step 3: Parallel processing of user/group + issues
  await Promise.all([
    async () => {
      if (!session.project_user_id) return;
      await analyzeUser(session.project_user_id);
      if (session.project_group_id)
        await analyzeGroup(session.project_group_id);
    },
    async () => {
      const { issueIds } = await reconcileIssues(sessionId);
      await Promise.all(issueIds.map((issueId) => analyzeIssue(issueId)));
    },
  ]);

  // Step 4: Kick off next pending session
  await next(session.project_id);
}
```

### Workflow Steps

Each step uses the `"use step"` directive, making it independently retryable:

1. **processReplay** - Converts session replay to video format
   - Triggers cloud service (fire-and-forget)
   - Cloud service calls back via `/jobs/process-replay/finished` webhook
   - Uses `resumeHook()` to resume the waiting workflow
   - Protected by 6-hour timeout

2. **analyzeSession** - AI-powered session analysis
   - Uses Google Gemini 2.5 Pro to analyze video and events
   - Generates: name, story, features used, detected issues, health score
   - Creates embeddings for similarity matching

3. **analyzeUser** - Maintains user-level insights
   - Aggregates all sessions for a specific user
   - Uses hash-based caching to skip redundant analysis
   - Generates: user story, health score

4. **analyzeGroup** - Organization-level analysis
   - Aggregates all users within a group/organization
   - Generates: group story, collective usage patterns

5. **reconcileIssues** - Intelligent issue deduplication
   - For each detected issue, finds similar issues via embedding search
   - Uses OpenAI GPT-5 to decide: merge with existing or create new
   - Returns issue IDs for further analysis

6. **analyzeIssue** - Issue-level analysis
   - Analyzes all sessions linked to an issue
   - Generates: name, story, type, severity, priority, confidence
   - Uses hash-based caching to prevent redundant analysis

7. **next** - Chain processing
   - Kicks off workflow for next pending session
   - Maintains continuous processing throughput

### Workflow Triggers

**Cron Job (Every 5 Minutes)**

Configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/jobs/sync",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Flow:
1. Cron triggers `/jobs/sync/route.ts`
2. Pulls new sessions from PostHog for all projects
3. Calls `kickoff(projectId)` to process pending sessions
4. `kickoff()` calls `start(run, [sessionId])` to begin workflow

**Webhook Callbacks**

The cloud video processing service calls back to:
- `/jobs/process-replay/accepted` - Updates status to "processing"
- `/jobs/process-replay/finished` - Updates status and calls `resumeHook()` to continue workflow

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
