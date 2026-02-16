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
  "story": "Power user exploring advanced features across 8 sessions over 7 days. Engagement is growing — session duration increased 40% week-over-week and feature breadth expanded from 3 to 7 unique features used. However, a critical blocker emerged: 3 of 8 sessions ended at the same CSV export timeout when datasets exceeded 10k rows. The user attempted workarounds (filtering down, paginating) but ultimately abandoned each time. Separately, filter state resets on back-navigation forced repeated configuration in every session, adding ~2 minutes of friction per visit. This user is deeply invested in the product but hitting real walls that will drive churn if unresolved.",
  "sessions": [
    {
      "sessionId": "s_a1b2c3",
      "score": 82,
      "activeSeconds": 342,
      "features": ["dashboard", "export", "filters"],
      "issues": ["Export timeout on large dataset"]
    },
    {
      "sessionId": "s_d4e5f6",
      "score": 45,
      "activeSeconds": 89,
      "features": ["export"],
      "issues": ["Export timeout", "Rage-clicked export button 4x"]
    },
    ...
  ],
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
  "story": "Acme Inc onboarded 4 users 3 weeks ago with strong initial engagement across the team. Since then, adoption has fragmented. chen@acme.com and priya@acme.com have gone fully inactive (14+ days, last sessions ended in confusion at the integration setup flow). The two remaining active users — sarah@acme.com and mike@acme.com — show narrowing feature usage, down to just dashboard views and basic filters. No user has completed the integration setup flow, which appears to be the critical adoption gate. Sarah attempted it twice but hit a permissions error both times. The account is at high risk of churning within the next renewal cycle without proactive outreach focused on unblocking integration setup.",
  "users": [
    {
      "email": "sarah@acme.com",
      "sessions": 12,
      "score": 68,
      "health": "Engaged but blocked on integrations"
    },
    {
      "email": "mike@acme.com",
      "sessions": 6,
      "score": 61,
      "health": "Narrowing usage — dashboard only"
    },
    {
      "email": "chen@acme.com",
      "sessions": 3,
      "score": 42,
      "health": "Churned — inactive 18 days"
    },
    ...
  ],
  "markdownPath": ".vesai/workspace/groups/acme-inc.md"
}`,
  },
  {
    label: "Research",
    question: "Why are users abandoning checkout?",
    command: 'vesai research "why are users abandoning checkout?"',
    output: `{
  "question": "why are users abandoning checkout?",
  "answer": "Checkout abandonment is driven by three compounding factors: shipping cost surprise, mobile form friction, and a distracting promo code field. 62% of users who reach checkout complete it on desktop, but mobile completion drops to just 21%. The primary drop-off point is the shipping address step, where mobile users encounter a silent autocomplete failure that forces manual entry. Users who see shipping costs for the first time at this step are 4.7x more likely to back-navigate than users who saw estimated costs earlier in the funnel.",
  "findings": [
    "Address autocomplete fails silently on mobile Safari — users see no error, just an empty field that won't advance",
    "Shipping cost appears only after full address entry — 38% of users who see it immediately navigate back to cart",
    "Promo code field is positioned above the purchase CTA and captures 23% of user attention time on the checkout page",
    "Desktop users who encounter form errors recover 80% of the time; mobile users recover only 27%",
    "Users who complete checkout in one attempt spend avg 47s; users who encounter any friction spend 3m12s and convert at 31%",
    ...
  ],
  "confidence": "high",
  "supportingSessionIds": [
    "s_a8f2c", "s_b91d0", "s_c43e7", "s_d67f1",
    "s_e82a3", "s_f19b7", "s_g44c2", "s_h55d8",
    ...
  ],
  "sessionsConsidered": 47,
  "sessionsUsed": 14
}`,
  },
];

export function Solution() {
  const [activeLevel, setActiveLevel] = useState(0);
  const level = levels[activeLevel]!;

  return (
    <Section className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
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

        <div className="mt-8 rounded-xl border border-border-subtle bg-bg-elevated p-5 sm:p-6">
          <p className="text-lg text-text-secondary italic">
            &ldquo;{level.question}&rdquo;
          </p>
          <div className="mt-1 font-mono text-text-muted text-xs">
            $ {level.command}
          </div>

          <div className="mt-4 max-h-[480px] overflow-y-auto rounded-lg border border-border-subtle bg-terminal p-4">
            <pre className="whitespace-pre-wrap break-words font-mono text-accent text-xs leading-relaxed sm:text-sm">
              <code>{level.output}</code>
            </pre>
          </div>
        </div>
      </div>
    </Section>
  );
}
