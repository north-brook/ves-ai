import { describe, expect, it } from "bun:test";
import { runCommandOrThrow } from "../connectors/shell";

describe("cli help", () => {
  it("shows rich top-level help", async () => {
    const result = await runCommandOrThrow("bun", ["cli/index.ts", "--help"]);

    expect(result.stdout).toContain("VES AI: AI-ready product analytics");
    expect(result.stdout).toContain("Replay Workflows");
    expect(result.stdout).toContain("Agent Workflows");
    expect(result.stdout).toContain("JSON is default for data commands");
    expect(result.stdout).toContain("replays query");
    expect(result.stdout).toContain("insights sql");
    expect(result.stdout).not.toContain("tui");
  });

  it("shows robust query filter help", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "replays",
      "query",
      "--help",
    ]);

    expect(result.stdout).toContain("--email <email>");
    expect(result.stdout).toContain("--from <isoDate>");
    expect(result.stdout).toContain("--where <key=value>");
    expect(result.stdout).toContain("--dry-run");
    expect(result.stdout).toContain("--no-json");
    expect(result.stdout).toContain(
      "literal search over replay/session metadata"
    );
    expect(result.stdout).toContain("Examples:");
  });

  it("teaches in-context learning for replay entity subcommands", async () => {
    const userHelp = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "replays",
      "user",
      "--help",
    ]);
    const listHelp = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "replays",
      "list",
      "--help",
    ]);

    expect(userHelp.stdout).toContain("User analysis contract");
    expect(userHelp.stdout).toContain("Learning flow");
    expect(listHelp.stdout).toContain("discover candidates");
    expect(listHelp.stdout).toContain("Next step");
  });

  it("shows PostHog analytics help surfaces", async () => {
    const events = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "events",
      "--help",
    ]);
    const insights = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "insights",
      "--help",
    ]);

    expect(events.stdout).toContain("event definitions");
    expect(insights.stdout).toContain("hogql");
    expect(insights.stdout).toContain("sql");
  });

  it("teaches logs query workflow in help output", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "logs",
      "query",
      "--help",
    ]);

    expect(result.stdout).toContain("vesai logs attributes");
    expect(result.stdout).toContain("vesai logs values <key>");
  });

  it("shows robust quickstart help", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "quickstart",
      "--help",
    ]);

    expect(result.stdout).toContain("--posthog-api-key <key>");
    expect(result.stdout).toContain("--non-interactive");
    expect(result.stdout).toContain("--max-concurrent-renders <n>");
    expect(result.stdout).toContain("All access + MCP server scope");
    expect(result.stdout).toContain("Examples:");
  });

  it("shows daemon lifecycle help for background and foreground modes", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "daemon",
      "--help",
    ]);

    expect(result.stdout).toContain("start");
    expect(result.stdout).toContain("watch");
    expect(result.stdout).toContain("background");
    expect(result.stdout).toContain("foreground");
  });

  it("shows safe config display options", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "config",
      "show",
      "--help",
    ]);

    expect(result.stdout).toContain("--show-secrets");
  });
});
