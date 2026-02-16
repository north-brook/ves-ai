"use client";

import { useState } from "react";
import { Section } from "./section";

const levels = [
  {
    label: "User",
    question: "How is bryce@company.com doing?",
    command: "vesai user bryce@company.com",
    output: `{
  "email": "bryce@company.com",
  "sessions_analyzed": 8,
  "score": 65,
  "story": "Power user exploring advanced features over 7 days. Encountered recurring friction in the export flow — 3 of 8 sessions ended at the same CSV timeout error. Despite this, engagement is increasing: session duration grew 40% week-over-week.",
  "top_issues": [
    "Export CSV timeout on datasets > 10k rows",
    "Filter state resets after back-navigation"
  ]
}`,
  },
  {
    label: "Group",
    question: "How is Acme Corp as a customer?",
    command: "vesai group acme-inc",
    output: `{
  "group": "Acme Inc",
  "users_analyzed": 4,
  "score": 58,
  "story": "Adoption is declining. 2 of 4 users have been inactive for 14+ days. The remaining active users show narrowing feature usage — down to just dashboard views. Initial onboarding was strong but no user has engaged with the integration setup flow.",
  "risk": "high",
  "recommendation": "Proactive outreach recommended. Focus on integration onboarding — this is where all 4 users dropped off."
}`,
  },
  {
    label: "Research",
    question: "What causes checkout abandonment?",
    command: 'vesai research "checkout abandonment"',
    output: `{
  "question": "What causes checkout abandonment?",
  "sessions_matched": 14,
  "synthesis": "Checkout flow has a 62% completion rate. Primary drop-off occurs at the shipping address step. Mobile users are 3x more likely to abandon.",
  "patterns": [
    "Address autocomplete fails on mobile Safari",
    "Shipping cost surprise causes back-navigation",
    "Promo code field draws attention away from CTA"
  ]
}`,
  },
];

export function Solution() {
  const [activeLevel, setActiveLevel] = useState(0);
  const level = levels[activeLevel]!;

  return (
    <Section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <h2 className="text-center font-bold text-3xl text-text-primary tracking-tight sm:text-4xl">
        AI that watches every session
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-text-secondary">
        Three levels of analysis. From a single recording to account-level
        intelligence.
      </p>

      <div className="mt-12">
        {/* Level tabs */}
        <div className="flex justify-center gap-2">
          {levels.map((l, i) => (
            <button
              className={`rounded-lg px-4 py-2 font-medium text-sm transition-colors ${
                i === activeLevel
                  ? "border border-accent/30 bg-accent/10 text-accent"
                  : "border border-transparent text-text-muted hover:text-text-secondary"
              }`}
              key={l.label}
              onClick={() => setActiveLevel(i)}
              type="button"
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-8 rounded-xl border border-border-subtle bg-bg-elevated p-6 sm:p-8">
          <p className="text-lg text-text-secondary italic">
            &ldquo;{level.question}&rdquo;
          </p>
          <div className="mt-1 font-mono text-text-muted text-xs">
            $ {level.command}
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border-subtle bg-terminal p-4">
            <pre className="whitespace-pre-wrap break-words font-mono text-accent text-xs leading-relaxed sm:text-sm">
              <code>{level.output}</code>
            </pre>
          </div>
        </div>
      </div>
    </Section>
  );
}
