"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const HOLD_AFTER_DONE_MS = 2500;
const PROGRESS_TICK_MS = 50;

interface CommandConfig {
  name: string;
  command: string;
  steps: { label: string; delay: number }[];
  summary: { lines: { label: string; value: string }[] };
}

const COMMANDS: CommandConfig[] = [
  {
    name: "User",
    command: "vesai user bryce@company.com",
    steps: [
      { label: "Find 8 sessions for bryce@company.com", delay: 700 },
      { label: "Render and analyze sessions", delay: 2200 },
      { label: "Aggregate user story", delay: 1600 },
    ],
    summary: {
      lines: [
        { label: "User", value: "bryce@company.com" },
        { label: "Sessions", value: "8 analyzed" },
        { label: "Score", value: "65 / 100" },
        {
          label: "Pattern",
          value: "Recurring export friction in 3/8 sessions",
        },
        {
          label: "Artifact",
          value: ".vesai/workspace/users/bryce_company_com.md",
        },
      ],
    },
  },
  {
    name: "Group",
    command: "vesai group acme-inc",
    steps: [
      { label: "Find 4 users in acme-inc", delay: 600 },
      { label: "Analyze user journeys", delay: 2400 },
      { label: "Aggregate group story", delay: 1400 },
    ],
    summary: {
      lines: [
        { label: "Group", value: "Acme Inc" },
        { label: "Users", value: "4 analyzed" },
        { label: "Score", value: "58 / 100" },
        {
          label: "Risk",
          value: "Adoption declining — 2 users inactive 14+ days",
        },
        {
          label: "Artifact",
          value: ".vesai/workspace/groups/acme-inc.md",
        },
      ],
    },
  },
  {
    name: "Research",
    command: 'vesai research "checkout abandonment"',
    steps: [
      { label: "Search analyzed sessions", delay: 800 },
      { label: "Synthesize findings with Gemini", delay: 2000 },
    ],
    summary: {
      lines: [
        {
          label: "Question",
          value: "What causes checkout abandonment?",
        },
        { label: "Sessions", value: "14 matched" },
        {
          label: "Finding",
          value: "62% drop off at shipping — mobile 3x worse",
        },
        {
          label: "Artifact",
          value: ".vesai/workspace/research/checkout-abandonment.md",
        },
      ],
    },
  },
];

function getTotalDuration(cfg: CommandConfig): number {
  const typingMs = cfg.command.length * 45;
  const bannerPause = 600;
  const stepsMs = cfg.steps.reduce((sum, s) => sum + s.delay, 0);
  const summaryPause = 600;
  return typingMs + bannerPause + stepsMs + summaryPause + HOLD_AFTER_DONE_MS;
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
  const [showSummary, setShowSummary] = useState(false);
  const [stepsComplete, setStepsComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
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
      setShowSummary(false);
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

  // Intersection observer
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

  // Progress bar
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

  // Typewriter
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
      30 + Math.random() * 30
    );
    return () => clearTimeout(timeout);
  }, [phase, typedChars, config.command.length]);

  // Step progression
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

  // Summary transition
  useEffect(() => {
    if (phase !== "summary") {
      return;
    }
    setStepsComplete(true);
    const timeout = setTimeout(() => {
      setShowSummary(true);
      setPhase("done");
    }, 500);
    return () => clearTimeout(timeout);
  }, [phase]);

  // Auto-advance
  useEffect(() => {
    if (phase !== "done") {
      return;
    }
    const timeout = setTimeout(advanceToNext, HOLD_AFTER_DONE_MS);
    return () => clearTimeout(timeout);
  }, [phase, advanceToNext]);

  // Spinner
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
      {/* Chrome */}
      <div className="terminal-chrome">
        <div className="terminal-dot terminal-dot-red" />
        <div className="terminal-dot terminal-dot-yellow" />
        <div className="terminal-dot terminal-dot-green" />
      </div>

      {/* Tabs */}
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

      {/* Body */}
      <div className="h-[340px] overflow-y-auto p-4 font-mono text-xs leading-relaxed sm:h-[380px] sm:p-5 sm:text-sm">
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
        {phase !== "idle" && phase !== "typing" && !showSummary && (
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

        {/* Summary */}
        {showSummary && (
          <div
            className="mt-3 rounded border border-accent/20 bg-accent/5 px-3 py-2.5"
            style={{ animation: "fade-in 0.5s ease-out forwards" }}
          >
            <div className="space-y-1">
              {config.summary.lines.map((line) => (
                <div className="flex gap-2" key={line.label}>
                  <span className="shrink-0 text-text-muted">{line.label}</span>
                  <span className="text-text-primary">{line.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
