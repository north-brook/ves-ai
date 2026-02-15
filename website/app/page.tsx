import Image from "next/image";

const installCommand = "curl -fsSL https://ves.ai/install | bash";

const quickstartChecklist = [
  "Authenticate gcloud and set a project",
  "Create a PostHog User API key (All access + MCP server scope)",
  "Run vesai quickstart and validate config",
  "Start daemon and queue your first analysis job",
];

const coreCommands = [
  "vesai quickstart",
  "vesai daemon start",
  "vesai analyze user you@example.com",
  'vesai analyze query "checkout friction" --from 2026-01-01 --to 2026-01-31',
  "vesai job <job_id>",
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
      <div className="grid-wash card-frame relative overflow-hidden p-8 sm:p-12">
        <div className="absolute -top-6 -right-6 h-20 w-20 animate-float rounded-2xl border-2 border-ink bg-sea-300" />
        <div className="absolute -bottom-8 left-10 h-16 w-16 animate-float rounded-full border-2 border-ink bg-yellow-300 [animation-delay:1200ms]" />

        <header className="relative z-10">
          <p className="mb-3 inline-flex items-center rounded-full border-2 border-ink bg-card px-3 py-1 font-medium text-xs uppercase tracking-[0.2em]">
            Open Source • Local First • Self Hosted
          </p>

          <h1 className="max-w-4xl font-bold text-4xl leading-[0.95] tracking-tight sm:text-6xl">
            Understand user behavior from session replays without giving up
            control.
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-relaxed sm:text-lg">
            VESAI runs on your machine, uses your PostHog and Google Cloud
            setup, and writes deterministic markdown artifacts to{" "}
            <code>~/.vesai/workspace</code>.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              className="inline-flex items-center rounded-xl border-2 border-ink bg-ink px-4 py-2 font-semibold text-sm text-white transition hover:-translate-y-0.5"
              href="https://github.com/north-brook/vesai"
              rel="noreferrer"
              target="_blank"
            >
              GitHub Repository
            </a>
            <a
              aria-label="GitHub stars"
              href="https://github.com/north-brook/vesai"
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt="GitHub stars"
                height={28}
                src="https://img.shields.io/github/stars/north-brook/vesai?style=for-the-badge"
                width={170}
              />
            </a>
          </div>
        </header>
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <article className="card-frame p-6">
          <h2 className="font-semibold text-2xl tracking-tight">Install</h2>
          <p className="mt-2 text-sm leading-relaxed">
            One command installs the runtime, links the binary, installs
            Playwright Chromium, and starts quickstart.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-ink p-4 text-lime-100 text-sm">
            <code>{installCommand}</code>
          </pre>
          <p className="mt-3 text-xs opacity-80">
            Script endpoint:{" "}
            <a className="underline decoration-2" href="/install">
              ves.ai/install
            </a>
          </p>
        </article>

        <article className="card-frame p-6">
          <h2 className="font-semibold text-2xl tracking-tight">
            Quickstart Flow
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {quickstartChecklist.map((item) => (
              <li
                className="flex items-start gap-2 rounded-lg border border-ink/20 bg-white/60 p-3"
                key={item}
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 font-mono text-sea-700"
                >
                  →
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card-frame mt-6 p-6">
        <h2 className="font-semibold text-2xl tracking-tight">Core Commands</h2>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-ink p-4 text-lime-100 text-sm">
          <code>{coreCommands.join("\n")}</code>
        </pre>
        <p className="mt-3 text-sm leading-relaxed">
          No auto-syncing every session. You queue only the analyses you want
          and poll status with <code>vesai job</code> or <code>vesai jobs</code>
          .
        </p>
      </section>
    </main>
  );
}
