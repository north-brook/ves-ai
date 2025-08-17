# VES Platform Spec

## 0. Home (/home)

**Purpose:** Launching pad to your project(s)

- If user has only one project, redirect to /[project]
- If user has multiple projects, render project cards that link to /[project]

---

## 1. Project Dashboard (/[project])

**Purpose:** High-level overview of project activity and session management

### Usage Metrics (Top Section)

- **Hours of Analysis**
  - Current period usage
  - Visual indicator of usage within current plan limits
  - Comparison to previous period
- **Sessions Analyzed**
  - Total count for current period
  - Comparison to previous period
- **Tickets Created**
  - Total Linear tickets created for current period
  - Comparison to previous period

### Session List

- **Session Status Indicators**
  - `pulled` - New session detected, not yet analyzed
  - `queued` - New session queued for watching and analysis
  - `watching` - Currently watching session
  - `analyzing` - Currently analyzing session
  - `done` - Analysis complete
- **Session Information**
  - Short descriptive name (AI-generated summary)
  - Inferred tags (Bug, UX Issue, Feature Opportunity, etc.)
  - Linked Linear tickets (if any)
  - Timestamp and duration
- **List Actions**
  - Each session row links to /[project]/[session]
  - Filter by status, tags, date range
  - Search by session name or user

---

## 2. Session Detail (/[project]/[session])

**Purpose:** Deep dive into an individual session with full analysis and context

### Page Components

#### Header

- Short descriptive name of the session (AI-generated)
- Session metadata (timestamp, duration, user ID)

#### Session Replay

- Embedded PostHog session replay player
- Full replay with AI-identified key moments highlighted

#### Analysis Section

- Full markdown analysis of the session
  - Key observations
  - User behavior patterns
  - Identified issues or opportunities
  - Recommended actions

#### Tags & Categorization

- Inferred tags categorizing the session
  - Bug types (UI, functionality, performance)
  - UX issues (navigation, confusion, errors)
  - Feature opportunities
  - Severity level

#### Linear Integration

- Embedded linked Linear tickets
  - Ticket title and status
  - Direct link to Linear
  - Option to create new ticket from analysis

#### Actions

- Export session analysis
- Share session link
- Create/link Linear ticket
- Add manual notes or tags
