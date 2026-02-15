export interface TerminalLine {
  type: "prompt" | "output" | "comment" | "blank";
  text: string;
}

export interface TerminalTab {
  label: string;
  lines: TerminalLine[];
}

export const heroTerminalLines: TerminalLine[] = [
  { type: "prompt", text: "curl -fsSL https://ves.ai/install | bash" },
  { type: "output", text: "Installing VES AI..." },
  { type: "output", text: "Linked vesai to ~/.local/bin/vesai" },
  { type: "blank", text: "" },
  { type: "prompt", text: "vesai quickstart --max-render-memory-mb 8192" },
  { type: "output", text: "Auto-updating VES AI from origin/main..." },
  { type: "output", text: "VES AI quickstart (global core setup)" },
  {
    type: "output",
    text: "Render budget set to 8192 MiB (dynamic scaling at 512 MiB/service)",
  },
  { type: "output", text: "Global quickstart complete." },
  { type: "blank", text: "" },
  { type: "prompt", text: "vesai init --lookback-days 180" },
  { type: "output", text: "Created .vesai/project.json" },
  { type: "output", text: "Added .vesai/ to .gitignore" },
  { type: "output", text: "Project init complete." },
  { type: "blank", text: "" },
  { type: "prompt", text: "vesai user bryce@company.com" },
  { type: "output", text: "Found 12 sessions for bryce@company.com" },
  { type: "output", text: "Rendering + analyzing sessions..." },
  { type: "blank", text: "" },
  { type: "comment", text: "{" },
  { type: "comment", text: '  "email": "bryce@company.com",' },
  { type: "comment", text: '  "sessionCount": 12,' },
  { type: "comment", text: '  "userScore": 78,' },
  {
    type: "comment",
    text: '  "markdownPath": ".vesai/workspace/users/bryce-company-com-bryce-company-com.md"',
  },
  { type: "comment", text: "}" },
];

export const terminalTabs: TerminalTab[] = [
  {
    label: "Setup",
    lines: [
      { type: "prompt", text: "vesai quickstart --max-render-memory-mb 8192" },
      { type: "output", text: "Auto-updating VES AI from origin/main..." },
      { type: "output", text: "VES AI quickstart (global core setup)" },
      {
        type: "output",
        text: "Configured core runtime at ~/.vesai/core.json",
      },
      {
        type: "output",
        text: "Render budget: 8192 MiB (dynamic service scaling enabled)",
      },
      { type: "output", text: "Global quickstart complete." },
      { type: "blank", text: "" },
      { type: "prompt", text: "vesai init --lookback-days 180" },
      { type: "output", text: "VES AI init (project setup)" },
      {
        type: "output",
        text: "Created .vesai/project.json with UUID projectId",
      },
      {
        type: "output",
        text: "Created .vesai/workspace/{sessions,users,groups,research}",
      },
      { type: "output", text: "Added .vesai/ to project .gitignore" },
      { type: "output", text: "Project init complete." },
    ],
  },
  {
    label: "Daemon",
    lines: [
      { type: "prompt", text: "vesai daemon start" },
      { type: "output", text: "Auto-updating VES AI from origin/main..." },
      { type: "output", text: "Daemon started in background (pid 49122)." },
      {
        type: "output",
        text: "Heartbeat queued 36 sessions (from 2025-08-20T00:00:00Z to now).",
      },
      {
        type: "output",
        text: "Running session jobs, then rerunning impacted user/group stories.",
      },
      { type: "blank", text: "" },
      { type: "prompt", text: "vesai daemon status" },
      { type: "comment", text: '{ "running": true, "pid": 49122 }' },
    ],
  },
  {
    label: "User Story",
    lines: [
      { type: "prompt", text: "vesai user bryce@company.com" },
      { type: "output", text: "Found 12 sessions for bryce@company.com" },
      {
        type: "output",
        text: "Processing sessions... ████████████████████ 12/12",
      },
      { type: "blank", text: "" },
      { type: "comment", text: "{" },
      { type: "comment", text: '  "email": "bryce@company.com",' },
      { type: "comment", text: '  "sessionCount": 12,' },
      { type: "comment", text: '  "averageSessionScore": 74,' },
      { type: "comment", text: '  "userScore": 78,' },
      {
        type: "comment",
        text: '  "health": "Stable with conversion friction at checkout",',
      },
      {
        type: "comment",
        text: '  "markdownPath": ".vesai/workspace/users/bryce-company-com-bryce-company-com.md"',
      },
      { type: "comment", text: "}" },
    ],
  },
  {
    label: "Group Story",
    lines: [
      { type: "prompt", text: "vesai group acme-co" },
      { type: "output", text: "Resolved 42 sessions across 9 users" },
      { type: "output", text: "Building user stories and group synthesis..." },
      { type: "blank", text: "" },
      { type: "comment", text: "{" },
      { type: "comment", text: '  "groupId": "acme-co",' },
      { type: "comment", text: '  "usersAnalyzed": 9,' },
      { type: "comment", text: '  "score": 69,' },
      {
        type: "comment",
        text: '  "health": "Adoption is strong, onboarding friction remains for mobile users",',
      },
      {
        type: "comment",
        text: '  "markdownPath": ".vesai/workspace/groups/acme-co-acme-co.md"',
      },
      { type: "comment", text: "}" },
    ],
  },
  {
    label: "Research",
    lines: [
      {
        type: "prompt",
        text: 'vesai research "What drives checkout abandonment?"',
      },
      {
        type: "output",
        text: "Selecting relevant analyzed sessions from .vesai/workspace/sessions",
      },
      {
        type: "output",
        text: "Answering with Gemini using replay evidence...",
      },
      { type: "blank", text: "" },
      { type: "comment", text: "{" },
      {
        type: "comment",
        text: '  "question": "What drives checkout abandonment?",',
      },
      { type: "comment", text: '  "confidence": "high",' },
      { type: "comment", text: '  "sessionsUsed": 12,' },
      {
        type: "comment",
        text: '  "supportingSessionIds": ["ph_112","ph_245","ph_318"],',
      },
      {
        type: "comment",
        text: '  "findings": ["Validation errors on postal code", "Shipping fee surprise", "Promo code distraction"]',
      },
      { type: "comment", text: "}" },
    ],
  },
];
