import { ArrowRight, Rocket } from "lucide-react";
import GoogleCloud from "./icons/google-cloud";
import Playwright from "./icons/playwright";
import PostHog from "./icons/posthog";
import { Section } from "./section";

const steps = [
  {
    name: "Connect",
    detail: "Pull session replays and events from your PostHog project",
    icon: <PostHog className="text-text-primary" size={28} />,
  },
  {
    name: "Render",
    detail: "Replay each session in headless Chromium via Playwright",
    icon: <Playwright className="text-text-primary" size={28} />,
  },
  {
    name: "Analyze",
    detail:
      "Gemini watches each video and extracts structured insights via Vertex AI",
    icon: <GoogleCloud className="text-text-primary" size={28} />,
  },
  {
    name: "Act",
    detail:
      "User, group, and research intelligence ready for your team or your agents",
    icon: <Rocket className="text-text-primary" size={28} strokeWidth={1.5} />,
  },
];

export function Pipeline() {
  return (
    <Section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <h2 className="text-center font-bold text-3xl text-text-primary tracking-tight sm:text-4xl">
        How it works
      </h2>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <div
            className="relative flex flex-col items-center text-center"
            key={step.name}
          >
            {i > 0 && (
              <div className="absolute top-10 -left-4 hidden text-accent/40 lg:block">
                <ArrowRight size={20} />
              </div>
            )}
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border-subtle bg-bg-elevated">
              {step.icon}
            </div>
            <h3 className="mt-4 font-semibold text-text-primary">
              {step.name}
            </h3>
            <p className="mt-1 max-w-[220px] text-sm text-text-muted">
              {step.detail}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
