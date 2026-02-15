import { ArrowRight, BrainCircuit, Download, Play, Rocket } from "lucide-react";
import { Section } from "./section";

const steps = [
  {
    name: "Capture",
    detail: "Pull replays & events from PostHog",
    icon: Download,
  },
  {
    name: "Render",
    detail: "Replay sessions in Playwright",
    icon: Play,
  },
  {
    name: "Analyze",
    detail: "Extract insights with Gemini Vision",
    icon: BrainCircuit,
  },
  {
    name: "Act",
    detail: "Output markdown agents can use",
    icon: Rocket,
  },
];

export function Pipeline() {
  return (
    <Section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <h2 className="text-center font-bold text-3xl text-text-primary tracking-tight sm:text-4xl">
        How It Works
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-text-secondary">
        From raw PostHog data to structured, agent-ready workspace artifacts in
        four steps.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <div className="relative flex flex-col items-center" key={step.name}>
            {i > 0 && (
              <div className="absolute top-10 -left-4 hidden text-accent/40 lg:block">
                <ArrowRight size={20} />
              </div>
            )}
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border-subtle bg-bg-elevated text-accent">
              <step.icon size={28} strokeWidth={1.5} />
            </div>
            <h3 className="mt-4 font-semibold text-text-primary">
              {step.name}
            </h3>
            <p className="mt-1 text-sm text-text-muted">{step.detail}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
