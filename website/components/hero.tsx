import { Copy, Github } from "lucide-react";
import { AnimatedTerminal } from "./animated-terminal";
import { CopyButton } from "./copy-button";

const installCommand = "curl -fsSL https://ves.ai/install | bash";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="grid gap-12 lg:grid-cols-[55%_45%] lg:items-center">
        <div>
          <h1 className="font-bold text-[44px] text-text-primary leading-[1.08] tracking-[-0.02em] sm:text-[64px]">
            Stop ignoring your session&nbsp;replays.
          </h1>

          <p className="mt-6 max-w-xl text-base text-text-secondary leading-[1.7] sm:text-lg">
            VES AI watches every PostHog session replay and turns them into rich
            user stories, product insights, and qualitative learnings your team
            can actually act&nbsp;on.
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
        </div>

        <AnimatedTerminal />
      </div>
    </section>
  );
}
