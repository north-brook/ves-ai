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
  { type: "output", text: "Installed vesai to ~/.vesai/bin/vesai" },
  { type: "blank", text: "" },
  { type: "prompt", text: "vesai quickstart" },
  { type: "output", text: "Connected to PostHog project: My App" },
  { type: "output", text: "GCS bucket: gs://vesai-renders ready" },
  { type: "output", text: "Quickstart complete." },
  { type: "blank", text: "" },
  { type: "prompt", text: "vesai replays session ph_abc123" },
  { type: "output", text: "Fetching session ph_abc123..." },
  { type: "output", text: "Rendering 47 events via Playwright..." },
  { type: "output", text: "Uploading 12 frames to GCS..." },
  { type: "output", text: "Analyzing with Gemini Vision..." },
  { type: "blank", text: "" },
  { type: "comment", text: '{ "session_id": "ph_abc123",' },
  { type: "comment", text: '  "score": 72,' },
  { type: "comment", text: '  "key_findings": [' },
  { type: "comment", text: '    "User rage-clicked checkout button 3x",' },
  { type: "comment", text: '    "Payment form validation blocked submit"' },
  { type: "comment", text: "  ] }" },
];

export const terminalTabs: TerminalTab[] = [
  {
    label: "Session Analysis",
    lines: [
      { type: "prompt", text: "vesai replays session ph_abc123" },
      { type: "output", text: "Fetching session ph_abc123..." },
      { type: "output", text: "Rendering 47 events via Playwright..." },
      { type: "output", text: "Uploading 12 frames to GCS..." },
      { type: "output", text: "Analyzing with Gemini Vision..." },
      { type: "blank", text: "" },
      { type: "comment", text: "{" },
      { type: "comment", text: '  "session_id": "ph_abc123",' },
      { type: "comment", text: '  "duration_seconds": 184,' },
      { type: "comment", text: '  "score": 72,' },
      { type: "comment", text: '  "severity": "medium",' },
      { type: "comment", text: '  "key_findings": [' },
      { type: "comment", text: '    "User rage-clicked checkout button 3x",' },
      {
        type: "comment",
        text: '    "Payment form validation blocked submit",',
      },
      { type: "comment", text: '    "Session ended without conversion"' },
      { type: "comment", text: "  ]," },
      {
        type: "comment",
        text: '  "workspace_artifact": "~/.vesai/workspace/sessions/ph_abc123.md"',
      },
      { type: "comment", text: "}" },
    ],
  },
  {
    label: "User Story",
    lines: [
      { type: "prompt", text: "vesai replays user bryce@company.com" },
      { type: "output", text: "Found 8 sessions for bryce@company.com" },
      {
        type: "output",
        text: "Processing sessions... ████████████████████ 8/8",
      },
      { type: "blank", text: "" },
      { type: "comment", text: "{" },
      { type: "comment", text: '  "user": "bryce@company.com",' },
      { type: "comment", text: '  "sessions_analyzed": 8,' },
      { type: "comment", text: '  "date_range": "2025-01-10 to 2025-01-17",' },
      {
        type: "comment",
        text: '  "summary": "Power user exploring advanced features.',
      },
      {
        type: "comment",
        text: "    Encountered recurring friction in export flow.",
      },
      {
        type: "comment",
        text: '    3 of 8 sessions ended at the same error modal.",',
      },
      { type: "comment", text: '  "top_issues": [' },
      { type: "comment", text: '    "Export CSV timeout on large datasets",' },
      { type: "comment", text: '    "Filter reset after navigating back"' },
      { type: "comment", text: "  ]," },
      {
        type: "comment",
        text: '  "workspace_artifact": "~/.vesai/workspace/users/bryce_company_com.md"',
      },
      { type: "comment", text: "}" },
    ],
  },
  {
    label: "Analytics Query",
    lines: [
      {
        type: "prompt",
        text: 'vesai insights sql "SELECT event, count() FROM events WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY event ORDER BY count() DESC LIMIT 5"',
      },
      { type: "blank", text: "" },
      { type: "comment", text: "{" },
      { type: "comment", text: '  "columns": ["event", "count"],' },
      { type: "comment", text: '  "results": [' },
      { type: "comment", text: '    ["$pageview",          48291],' },
      { type: "comment", text: '    ["$autocapture",       31044],' },
      { type: "comment", text: '    ["checkout_started",    8712],' },
      { type: "comment", text: '    ["item_added_to_cart",  6203],' },
      { type: "comment", text: '    ["payment_completed",   2847]' },
      { type: "comment", text: "  ]" },
      { type: "comment", text: "}" },
    ],
  },
  {
    label: "Query Replays",
    lines: [
      {
        type: "prompt",
        text: 'vesai replays query "checkout" --url /checkout',
      },
      {
        type: "output",
        text: "Querying replays matching: checkout (url=/checkout)",
      },
      { type: "output", text: "Found 14 matching sessions" },
      {
        type: "output",
        text: "Processing sessions... ████████████████████ 14/14",
      },
      { type: "output", text: "Synthesizing cross-session analysis..." },
      { type: "blank", text: "" },
      { type: "comment", text: "{" },
      { type: "comment", text: '  "query": "checkout",' },
      { type: "comment", text: '  "sessions_analyzed": 14,' },
      {
        type: "comment",
        text: '  "synthesis": "Checkout flow has a 62% completion rate.',
      },
      {
        type: "comment",
        text: "    Primary drop-off occurs at the shipping address step.",
      },
      {
        type: "comment",
        text: '    Mobile users are 3x more likely to abandon.",',
      },
      { type: "comment", text: '  "common_patterns": [' },
      {
        type: "comment",
        text: '    "Address autocomplete fails on mobile Safari",',
      },
      {
        type: "comment",
        text: '    "Shipping cost surprise causes back-navigation",',
      },
      {
        type: "comment",
        text: '    "Promo code field draws attention away from CTA"',
      },
      { type: "comment", text: "  ]," },
      {
        type: "comment",
        text: '  "workspace_artifact": "~/.vesai/workspace/queries/checkout.md"',
      },
      { type: "comment", text: "}" },
    ],
  },
];
