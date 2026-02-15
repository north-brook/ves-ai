import { Copy, Github } from "lucide-react";
import type { TerminalLine } from "../lib/terminal-content";
import { heroTerminalLines } from "../lib/terminal-content";
import { CopyButton } from "./copy-button";

function TerminalLineEl({ line }: { line: TerminalLine }) {
  if (line.type === "blank") {
    return <div className="h-4" />;
  }

  if (line.type === "prompt") {
    return (
      <div>
        <span className="text-text-muted">$ </span>
        <span className="text-text-primary">{line.text}</span>
      </div>
    );
  }

  if (line.type === "comment") {
    return <div className="text-accent">{line.text}</div>;
  }

  return <div className="text-text-secondary">{line.text}</div>;
}

const installCommand = "curl -fsSL https://ves.ai/install | bash";

const prereqs = ["git", "bun", "gcloud", "ffmpeg"];
const keyedHeroTerminalLines = createStableKeyedLines(heroTerminalLines);

function createStableKeyedLines(lines: TerminalLine[]) {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const base = `${line.type}:${line.text}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return { key: `${base}:${count}`, line };
  });
}

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="grid gap-12 lg:grid-cols-[55%_45%] lg:items-center">
        <div>
          <div className="mb-6 inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent text-sm">
            AI-ready product analytics CLI
          </div>

          <h1 className="font-bold text-[48px] text-text-primary leading-[1.05] tracking-[-0.02em] sm:text-[72px]">
            Make product analytics actionable for AI&nbsp;agents.
          </h1>

          <p className="mt-6 max-w-xl text-base text-text-secondary leading-[1.7] sm:text-lg">
            Connect PostHog. Render session recordings. Analyze with Gemini
            vision. Output structured markdown your agents can act on.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CopyButton
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-medium text-bg-primary text-sm transition-colors hover:bg-accent/90"
              text={installCommand}
            >
              <span className="flex items-center gap-2">
                <Copy size={14} />
                Install
              </span>
            </CopyButton>
            <a
              className="inline-flex items-center gap-2 rounded-lg border border-border-subtle px-5 py-2.5 text-sm text-text-secondary transition-colors hover:border-border-emphasis hover:text-text-primary"
              href="https://github.com/north-brook/ves-ai"
              rel="noreferrer"
              target="_blank"
            >
              <Github size={14} />
              View on GitHub
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-text-muted text-xs">Requires</span>
            {prereqs.map((p) => (
              <span
                className="rounded-md bg-bg-surface px-2 py-0.5 font-mono text-text-muted text-xs"
                key={p}
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="terminal-window">
          <div className="terminal-chrome">
            <div className="terminal-dot terminal-dot-red" />
            <div className="terminal-dot terminal-dot-yellow" />
            <div className="terminal-dot terminal-dot-green" />
            <span className="ml-3 font-mono text-text-muted text-xs">
              Terminal — vesai
            </span>
          </div>
          <div className="terminal-body font-mono">
            {keyedHeroTerminalLines.map(({ key, line }) => (
              <TerminalLineEl key={key} line={line} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
