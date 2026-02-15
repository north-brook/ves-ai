"use client";

import { useState } from "react";
import type { TerminalLine } from "../lib/terminal-content";
import { terminalTabs } from "../lib/terminal-content";

function Line({ line }: { line: TerminalLine }) {
  if (line.type === "blank") {
    return <div className="h-4" />;
  }

  if (line.type === "prompt") {
    return (
      <div className="whitespace-pre-wrap break-all">
        <span className="text-text-muted">$ </span>
        <span className="text-text-primary">{line.text}</span>
      </div>
    );
  }

  if (line.type === "comment") {
    return <div className="whitespace-pre text-accent">{line.text}</div>;
  }

  return <div className="text-text-secondary">{line.text}</div>;
}

function createStableKeyedLines(lines: TerminalLine[]) {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const base = `${line.type}:${line.text}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return { key: `${base}:${count}`, line };
  });
}

const keyedTerminalTabs = terminalTabs.map((tab) => ({
  ...tab,
  keyedLines: createStableKeyedLines(tab.lines),
}));

export function TerminalShowcase() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <h2 className="text-center font-bold text-3xl text-text-primary tracking-tight sm:text-4xl">
        See It in Action
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-text-secondary">
        Real commands, real output. Every data command returns structured JSON
        by default.
      </p>

      <div className="terminal-window mt-12 shadow-[0_0_80px_-20px_rgba(16,185,129,0.15)]">
        <div className="terminal-chrome">
          <div className="terminal-dot terminal-dot-red" />
          <div className="terminal-dot terminal-dot-yellow" />
          <div className="terminal-dot terminal-dot-green" />
          <span className="ml-3 font-mono text-text-muted text-xs">
            Terminal — vesai
          </span>
        </div>

        <div className="flex overflow-x-auto border-border-subtle border-b">
          {keyedTerminalTabs.map((tab, i) => (
            <button
              className={`whitespace-nowrap px-5 py-3 font-medium text-sm transition-colors ${
                i === activeTab
                  ? "border-accent border-b-2 text-accent"
                  : "text-text-muted hover:text-text-secondary"
              }`}
              key={tab.label}
              onClick={() => setActiveTab(i)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="terminal-body min-h-[320px] font-mono">
          {keyedTerminalTabs[activeTab].keyedLines.map(({ key, line }) => (
            <Line key={key} line={line} />
          ))}
        </div>
      </div>
    </section>
  );
}
