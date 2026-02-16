"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const HOLD_AFTER_DONE_MS = 3000;
const PROGRESS_TICK_MS = 50;

interface CommandConfig {
  name: string;
  command: string;
  steps: { label: string; delay: number }[];
  output: string;
}

const COMMANDS: CommandConfig[] = [
  {
    name: "User",
    command: "vesai user bryce@company.com",
    steps: [
      { label: "Found 8 sessions for bryce@company.com", delay: 600 },
      { label: "Rendering session 1/8", delay: 400 },
      { label: "Rendering session 2/8", delay: 350 },
      { label: "Rendering session 3/8", delay: 400 },
      { label: "Analyzing 8 sessions with Gemini", delay: 1800 },
      { label: "Aggregating user story", delay: 1200 },
    ],
    output: `{
  "email": "bryce@company.com",
  "sessionCount": 8,
  "averageSessionScore": 71,
  "userScore": 65,
  "health": "At risk — recurring friction in core workflow",
  "story": "Power user with increasing engagement over 7 days. However, 3 of 8 sessions ended at the same CSV export timeout on datasets over 10k rows. Filter state also resets after back-navigation, forcing repeated setup. Despite friction, session duration grew 40% week-over-week — this user is invested but hitting real walls.",
  "markdownPath": ".vesai/workspace/users/bryce-company-com.md"
}`,
  },
  {
    name: "Group",
    command: "vesai group acme-inc",
    steps: [
      { label: "Resolved 4 users in acme-inc", delay: 500 },
      {
        label: "Building user story: sarah@acme.com (12 sessions)",
        delay: 1200,
      },
      { label: "Building user story: mike@acme.com (6 sessions)", delay: 900 },
      { label: "Building user story: chen@acme.com (3 sessions)", delay: 600 },
      { label: "Building user story: priya@acme.com (1 session)", delay: 400 },
      { label: "Aggregating group story", delay: 1000 },
    ],
    output: `{
  "groupId": "acme-inc",
  "usersAnalyzed": 4,
  "score": 58,
  "health": "Adoption declining — intervention recommended",
  "story": "Acme Inc onboarded 4 users 3 weeks ago. Initial engagement was strong across all users. Since then, chen@acme.com and priya@acme.com have gone inactive (14+ days). The two active users show narrowing feature usage — primarily dashboard views only. No user has completed the integration setup flow, which appears to be the critical adoption gate.",
  "markdownPath": ".vesai/workspace/groups/acme-inc.md"
}`,
  },
  {
    name: "Research",
    command: 'vesai research "why are users abandoning checkout?"',
    steps: [
      { label: "Scanning 47 analyzed sessions in workspace", delay: 600 },
      { label: "Selected 14 relevant sessions as context", delay: 500 },
      { label: "Synthesizing research answer with Gemini", delay: 1800 },
    ],
    output: `{
  "question": "why are users abandoning checkout?",
  "answer": "Checkout abandonment is driven by three compounding factors: shipping cost surprise, mobile form friction, and a distracting promo code field. 62% of users who reach checkout complete it, but mobile users are 3x more likely to abandon than desktop.",
  "findings": [
    "Address autocomplete fails silently on mobile Safari, forcing manual entry",
    "Shipping cost appears only after address entry — users back-navigate on sticker shock",
    "Promo code field positioned above the CTA draws attention away from completing purchase",
    "Desktop users who encounter errors recover 80% of the time; mobile users recover 27%"
  ],
  "confidence": "high",
  "supportingSessionIds": ["s_a8f2c", "s_b91d0", "s_c43e7", "s_d67f1"],
  "sessionsConsidered": 47,
  "sessionsUsed": 14
}`,
  },
];

function getTotalDuration(cfg: CommandConfig): number {
  const typingMs = cfg.command.length * 40;
  const stepsMs = cfg.steps.reduce((sum, s) => sum + s.delay, 0);
  return typingMs + 400 + stepsMs + 500 + HOLD_AFTER_DONE_MS;
}

type StepStatus = "hidden" | "running" | "done";
type Phase = "idle" | "typing" | "steps" | "summary" | "done";

function getCommand(index: number): CommandConfig {
  return COMMANDS[index] ?? COMMANDS[0]!;
}

export function AnimatedTerminal() {
  const [activeTab, setActiveTab] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [typedChars, setTypedChars] = useState(0);
  const [steps, setSteps] = useState<{ label: string; status: StepStatus }[]>(
    []
  );
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const [showOutput, setShowOutput] = useState(false);
  const [stepsComplete, setStepsComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);
  const abortRef = useRef(false);
  const progressStart = useRef(0);

  const config = getCommand(activeTab);

  const startAnimation = useCallback((index: number) => {
    const cfg = getCommand(index);
    abortRef.current = true;
    setTimeout(() => {
      setActiveTab(index);
      setPhase("idle");
      setTypedChars(0);
      setSteps(cfg.steps.map((s) => ({ label: s.label, status: "hidden" })));
      setSpinnerFrame(0);
      setShowOutput(false);
      setStepsComplete(false);
      setProgress(0);
      abortRef.current = false;
      hasStarted.current = true;
      progressStart.current = Date.now();
      setTimeout(() => setPhase("typing"), 100);
    }, 10);
  }, []);

  const advanceToNext = useCallback(() => {
    const next = (activeTab + 1) % COMMANDS.length;
    startAnimation(next);
  }, [activeTab, startAnimation]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !hasStarted.current) {
          startAnimation(0);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [startAnimation]);

  useEffect(() => {
    if (phase === "idle") {
      return;
    }
    const totalDuration = getTotalDuration(config);
    const interval = setInterval(() => {
      const elapsed = Date.now() - progressStart.current;
      setProgress(Math.min(elapsed / totalDuration, 1));
    }, PROGRESS_TICK_MS);
    return () => clearInterval(interval);
  }, [phase, config]);

  useEffect(() => {
    if (phase !== "typing") {
      return;
    }
    if (typedChars >= config.command.length) {
      const timeout = setTimeout(() => setPhase("steps"), 400);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(
      () => setTypedChars((c) => c + 1),
      25 + Math.random() * 30
    );
    return () => clearTimeout(timeout);
  }, [phase, typedChars, config.command.length]);

  useEffect(() => {
    if (phase !== "steps") {
      return;
    }
    const currentSteps = config.steps;
    const runSteps = async () => {
      for (let i = 0; i < currentSteps.length; i++) {
        if (abortRef.current) {
          return;
        }
        const step = currentSteps[i];
        if (!step) {
          continue;
        }
        setSteps((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, status: "running" } : s))
        );
        await new Promise((r) => setTimeout(r, step.delay));
        if (abortRef.current) {
          return;
        }
        setSteps((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, status: "done" } : s))
        );
      }
      if (!abortRef.current) {
        setPhase("summary");
      }
    };
    runSteps();
  }, [phase, config.steps]);

  useEffect(() => {
    if (phase !== "summary") {
      return;
    }
    setStepsComplete(true);
    const timeout = setTimeout(() => {
      setShowOutput(true);
      setPhase("done");
      // Scroll to top of output
      setTimeout(() => {
        bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    }, 500);
    return () => clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") {
      return;
    }
    const timeout = setTimeout(advanceToNext, HOLD_AFTER_DONE_MS);
    return () => clearTimeout(timeout);
  }, [phase, advanceToNext]);

  useEffect(() => {
    const hasRunning = steps.some((s) => s.status === "running");
    if (!hasRunning) {
      return;
    }
    const interval = setInterval(() => {
      setSpinnerFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 90);
    return () => clearInterval(interval);
  }, [steps]);

  return (
    <div
      className="terminal-window shadow-[0_0_80px_-20px_rgba(16,185,129,0.12)]"
      ref={containerRef}
    >
      <div className="terminal-chrome">
        <div className="terminal-dot terminal-dot-red" />
        <div className="terminal-dot terminal-dot-yellow" />
        <div className="terminal-dot terminal-dot-green" />
      </div>

      <div className="flex overflow-x-auto border-border-subtle border-b">
        {COMMANDS.map((cmd, i) => (
          <button
            className={`relative whitespace-nowrap px-4 py-2.5 font-mono text-xs transition-colors ${
              i === activeTab
                ? "text-accent"
                : "text-text-muted hover:text-text-secondary"
            }`}
            key={cmd.name}
            onClick={() => startAnimation(i)}
            type="button"
          >
            {cmd.name}
            <span
              className="absolute right-0 bottom-0 left-0 h-0.5 origin-left transition-transform"
              style={{
                backgroundColor:
                  i === activeTab ? "var(--color-accent)" : "transparent",
                transform: `scaleX(${i === activeTab ? progress : 0})`,
              }}
            />
          </button>
        ))}
      </div>

      <div
        className="h-[340px] overflow-y-auto p-4 font-mono text-xs leading-relaxed sm:h-[420px] sm:p-5 sm:text-sm"
        ref={bodyRef}
      >
        {/* Command line */}
        <div className="flex items-center">
          <span className="text-text-muted">$</span>
          <span className="ml-2 text-text-primary">
            {phase === "idle" ? "" : config.command.slice(0, typedChars)}
            {phase === "typing" && (
              <span className="animate-pulse text-accent">▋</span>
            )}
          </span>
        </div>

        {/* Steps */}
        {phase !== "idle" && phase !== "typing" && !showOutput && (
          <div
            className="mt-3 space-y-1"
            style={{
              opacity: stepsComplete ? 0 : 1,
              transition: "opacity 400ms ease-in-out",
            }}
          >
            {steps.map(
              (step) =>
                step.status !== "hidden" && (
                  <div className="flex items-center gap-2" key={step.label}>
                    {step.status === "running" && (
                      <span className="text-accent">
                        {SPINNER_FRAMES[spinnerFrame]}
                      </span>
                    )}
                    {step.status === "done" && (
                      <span className="text-accent">✔</span>
                    )}
                    <span
                      className={
                        step.status === "done"
                          ? "text-text-secondary"
                          : "text-accent"
                      }
                    >
                      {step.label}
                    </span>
                  </div>
                )
            )}
          </div>
        )}

        {/* JSON output */}
        {showOutput && (
          <pre
            className="mt-3 whitespace-pre-wrap break-words text-accent"
            style={{ animation: "fade-in 0.5s ease-out forwards" }}
          >
            {config.output}
          </pre>
        )}
      </div>
    </div>
  );
}
