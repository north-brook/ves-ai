import { BookOpen, Code2, FolderOpen, Server } from "lucide-react";
import { Section } from "./section";

const cards = [
  {
    title: "Machine-Readable by Default",
    description:
      "Every data command emits JSON. Pipe output directly into your agent workflows, CI pipelines, or dashboards.",
    icon: Code2,
  },
  {
    title: "Durable Workspace Artifacts",
    description:
      "Session, user, and query analyses persist as git-friendly markdown in ~/.vesai/workspace/ for long-lived agent context.",
    icon: FolderOpen,
  },
  {
    title: "Local-First, Self-Hosted",
    description:
      "Your PostHog keys, your GCP project, your machine. No data leaves your infrastructure.",
    icon: Server,
  },
  {
    title: "Ships with a SKILL.md",
    description:
      "A comprehensive skill file teaches Claude Code, Codex, and other coding agents how to use every vesai command, workflow, and HogQL pattern out of the box.",
    icon: BookOpen,
  },
];

export function AgentCards() {
  return (
    <Section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <h2 className="text-center font-bold text-3xl text-text-primary tracking-tight sm:text-4xl">
        Built for AI Agents
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-text-secondary">
        Same commands, same outputs whether you&apos;re a human or a coding
        agent.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article
            className="rounded-xl border border-border-subtle bg-bg-elevated p-6 transition-colors hover:border-border-emphasis"
            key={card.title}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-bg-surface text-accent">
              <card.icon size={24} strokeWidth={1.5} />
            </div>
            <h3 className="mt-4 font-semibold text-text-primary">
              {card.title}
            </h3>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              {card.description}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
