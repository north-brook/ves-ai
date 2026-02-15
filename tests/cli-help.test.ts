import { describe, expect, it } from "bun:test";
import { runCommandOrThrow } from "../packages/connectors/src/shell";

describe("cli help", () => {
  it("shows rich top-level help", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/src/index.ts",
      "--help",
    ]);

    expect(result.stdout).toContain(
      "VESAI local-first CLI for replay analysis + PostHog analytics"
    );
    expect(result.stdout).toContain("Replay Workflows");
    expect(result.stdout).toContain("replays query");
    expect(result.stdout).toContain("insights sql");
    expect(result.stdout).not.toContain("tui");
  });

  it("shows robust query filter help", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/src/index.ts",
      "replays",
      "query",
      "--help",
    ]);

    expect(result.stdout).toContain("--email <email>");
    expect(result.stdout).toContain("--from <isoDate>");
    expect(result.stdout).toContain("--where <key=value>");
    expect(result.stdout).toContain("Examples:");
  });

  it("shows PostHog analytics help surfaces", async () => {
    const events = await runCommandOrThrow("bun", [
      "cli/src/index.ts",
      "events",
      "--help",
    ]);
    const insights = await runCommandOrThrow("bun", [
      "cli/src/index.ts",
      "insights",
      "--help",
    ]);

    expect(events.stdout).toContain("event definitions");
    expect(insights.stdout).toContain("hogql");
    expect(insights.stdout).toContain("sql");
  });

  it("shows robust quickstart help", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/src/index.ts",
      "quickstart",
      "--help",
    ]);

    expect(result.stdout).toContain("--posthog-api-key <key>");
    expect(result.stdout).toContain("--non-interactive");
    expect(result.stdout).toContain("--max-concurrent-renders <n>");
    expect(result.stdout).toContain("Examples:");
  });

  it("shows daemon lifecycle help for background and foreground modes", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/src/index.ts",
      "daemon",
      "--help",
    ]);

    expect(result.stdout).toContain("start");
    expect(result.stdout).toContain("watch");
    expect(result.stdout).toContain("background");
    expect(result.stdout).toContain("foreground");
  });
});
