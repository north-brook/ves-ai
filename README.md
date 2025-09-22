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

VES AI uses a sophisticated job orchestration system to process session data through multiple stages of analysis. The system operates on two schedules:

### Frequent Jobs (Every 5 Minutes)

The core session processing pipeline runs continuously to analyze new user sessions:

1. **sync-sessions** - Entry point that discovers new sessions from PostHog
   - Fetches recordings from all configured PostHog sources
   - Creates session records in the database
   - Respects project worker limits to manage concurrent processing
   - Triggers process-replay jobs for new sessions

2. **process-replay** - Converts raw session data to analyzable format
   - Calls cloud service to fetch raw rrweb JSON from PostHog
   - Constructs WebM video of the session using Playwright
   - Uploads video and events to Google Cloud Storage
   - Triggers analyze-session job upon completion

3. **analyze-session** - AI-powered session analysis
   - Uses Gemini AI to analyze the session video
   - Creates a comprehensive session story describing user behavior
   - Identifies features used and issues (bugs, friction points)
   - Reconciles features and issues with existing features and issues
   - Triggers analyze-user and analyze-feature jobs upon completion

4. **analyze-user** - Maintains user-level insights
   - Aggregates all session stories for a specific user
   - Uses AI to maintain an evolving user story
   - Tracks user journey and behavior patterns over time
   - Triggers analyze-group job if user belongs to a group

5. **analyze-group** - Organization-level analysis
   - Aggregates all user stories within an organization/group
   - Maintains a group story showing collective usage patterns
   - Identifies organization-wide trends and issues

6. **analyze-feature** - Feature-specific analysis
   - Maintains a feature story based on all linked sessions
   - Tracks feature adoption, usage patterns, and issues
   - Provides feature health metrics and recommendations

### Weekly Jobs (Every 6 Hours)

These jobs maintain higher-level abstractions and create actionable insights:

1. **analyze-project** - Weekly report generation
   - Summarizes new sessions, features, and issues
   - Writes a concise report of the overall product health
   - Highlights

### Job Coordination

The system uses several coordination mechanisms:

- **Worker Limits** - Each project has concurrent worker limits based on their plan
- **Job Chaining** - Jobs trigger subsequent jobs upon successful completion
- **Dependency Management** - Jobs wait for required data before processing
- **Error Handling** - Failed jobs are marked and don't block the pipeline
- **Callback System** - Cloud service uses callbacks to report completion

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
