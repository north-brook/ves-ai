import { Check } from "lucide-react";
import { CodeBlock } from "./code-block";
import { Section } from "./section";

const prerequisites = [
  { name: "git", note: "Version control" },
  { name: "bun", note: "JavaScript runtime" },
  { name: "gcloud", note: "Google Cloud SDK, authenticated" },
  { name: "ffmpeg", note: "Video processing" },
];

const steps = [
  {
    step: "1",
    label: "Install VES AI",
    code: "curl -fsSL https://ves.ai/install | bash",
  },
  {
    step: "2",
    label: "Run quickstart",
    code: "vesai quickstart",
  },
  {
    step: "3",
    label: "Analyze your first session",
    code: "vesai replays session <session_id>",
  },
];

export function GettingStarted() {
  return (
    <Section
      className="mx-auto max-w-6xl px-6 py-16 sm:py-24"
      id="getting-started"
    >
      <h2 className="text-center font-bold text-3xl text-text-primary tracking-tight sm:text-4xl">
        Getting Started
      </h2>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <div>
          <h3 className="font-semibold text-lg text-text-primary">
            Prerequisites
          </h3>
          <ul className="mt-4 space-y-3">
            {prerequisites.map((p) => (
              <li className="flex items-center gap-3" key={p.name}>
                <Check className="shrink-0 text-accent" size={16} />
                <span className="font-mono text-sm text-text-primary">
                  {p.name}
                </span>
                <span className="text-sm text-text-muted">{p.note}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <p className="mb-2 text-sm text-text-muted">Authenticate gcloud:</p>
            <CodeBlock
              code={"gcloud auth login\ngcloud auth application-default login"}
            />
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-lg text-text-primary">
            Three Steps
          </h3>
          <ol className="mt-4 space-y-6">
            {steps.map((s) => (
              <li key={s.step}>
                <div className="mb-2 flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 font-semibold text-accent text-sm">
                    {s.step}
                  </span>
                  <span className="text-sm text-text-secondary">{s.label}</span>
                </div>
                <CodeBlock code={s.code} />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
