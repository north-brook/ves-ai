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
  "sessionCount": 8,
  "averageSessionScore": 71,
  "userScore": 65,
  "health": "At risk — recurring friction in core workflow",
  "story": "Power user with increasing engagement over 7 days. 3 of 8 sessions ended at the same CSV export timeout on datasets over 10k rows. Filter state resets after back-navigation, forcing repeated setup. Despite friction, session duration grew 40% week-over-week — this user is invested but hitting real walls.",
  "markdownPath": ".vesai/workspace/users/bryce-company-com.md"
}`,
  },
  {
    label: "Group",
    question: "How is Acme Corp as a customer?",
    command: "vesai group acme-inc",
    output: `{
  "groupId": "acme-inc",
  "usersAnalyzed": 4,
  "score": 58,
  "health": "Adoption declining — intervention recommended",
  "story": "Acme Inc onboarded 4 users 3 weeks ago. Initial engagement was strong. Since then, 2 users have gone inactive (14+ days). The remaining active users show narrowing feature usage — primarily dashboard views only. No user has completed the integration setup flow, which appears to be the critical adoption gate. Proactive outreach recommended.",
  "markdownPath": ".vesai/workspace/groups/acme-inc.md"
}`,
  },
  {
    label: "Research",
    question: "Why are users abandoning checkout?",
    command: 'vesai research "why are users abandoning checkout?"',
    output: `{
  "question": "why are users abandoning checkout?",
  "answer": "Checkout abandonment is driven by three compounding factors: shipping cost surprise, mobile form friction, and a distracting promo code field. 62% of users who reach checkout complete it, but mobile users are 3x more likely to abandon than desktop users.",
  "findings": [
    "Address autocomplete fails silently on mobile Safari, forcing manual entry",
    "Shipping cost appears only after address entry — users back-navigate on sticker shock",
    "Promo code field above CTA draws attention away from completing purchase",
    "Desktop users who encounter errors recover 80% of the time; mobile users recover 27%"
  ],
  "confidence": "high",
  "supportingSessionIds": ["s_a8f2c", "s_b91d0", "s_c43e7", "s_d67f1"],
  "sessionsConsidered": 47,
  "sessionsUsed": 14
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
        From individual user stories to account-level intelligence to product
        research — all from your existing PostHog&nbsp;data.
      </p>

      <div className="mt-12">
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
