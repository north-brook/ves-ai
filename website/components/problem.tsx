import { BarChart3, Bug, Video } from "lucide-react";
import { Section } from "./section";

const cards = [
  {
    icon: Video,
    stat: "<1% watched",
    text: "Your team records thousands of sessions. Almost none get reviewed.",
  },
  {
    icon: Bug,
    stat: "Hidden bugs",
    text: "Real issues hide in replays nobody has time to watch.",
  },
  {
    icon: BarChart3,
    stat: "Vibes-based decisions",
    text: "Product decisions get made on gut feel, not evidence from real user behavior.",
  },
];

export function Problem() {
  return (
    <Section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <h2 className="text-center font-bold text-3xl text-text-primary tracking-tight sm:text-4xl">
        The replay graveyard
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-text-secondary">
        Your PostHog replays are a gold mine. Nobody&apos;s watching&nbsp;them.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <article
            className="rounded-xl border border-border-subtle bg-bg-elevated p-6 text-center transition-colors hover:border-border-emphasis"
            key={card.stat}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-bg-surface text-accent">
              <card.icon size={24} strokeWidth={1.5} />
            </div>
            <div className="mt-4 font-bold text-lg text-text-primary">
              {card.stat}
            </div>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              {card.text}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
