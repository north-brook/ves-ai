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
