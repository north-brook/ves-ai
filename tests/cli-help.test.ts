import { describe, expect, it } from "bun:test";
import { runCommandOrThrow } from "../connectors/shell";

describe("cli help", () => {
  it("shows replay-focused top-level help", async () => {
    const result = await runCommandOrThrow("bun", ["cli/index.ts", "--help"]);

    expect(result.stdout).toContain(
      "VES AI: session replay intelligence for agents"
    );
    expect(result.stdout).toContain("vesai init");
    expect(result.stdout).toContain("Replay Story Workflows");
    expect(result.stdout).toContain("vesai user");
    expect(result.stdout).toContain("vesai group");
    expect(result.stdout).toContain("vesai research");
    expect(result.stdout).not.toContain("vesai events");
    expect(result.stdout).not.toContain("vesai insights");
  });

  it("shows user command help", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "user",
      "--help",
    ]);

    expect(result.stdout).toContain("Analyze one user story");
    expect(result.stdout).toContain("--max-concurrent <n>");
  });

  it("shows group command help", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "group",
      "--help",
    ]);

    expect(result.stdout).toContain("Analyze one group story");
    expect(result.stdout).toContain("<groupId>");
  });

  it("shows research command help", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "research",
      "--help",
    ]);

    expect(result.stdout).toContain("already analyzed sessions");
    expect(result.stdout).toContain("--limit <n>");
  });

  it("shows init lookback option", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "init",
      "--help",
    ]);

    expect(result.stdout).toContain("--lookback-days <n>");
  });

  it("shows daemon lifecycle help", async () => {
    const result = await runCommandOrThrow("bun", [
      "cli/index.ts",
      "daemon",
      "--help",
    ]);

    expect(result.stdout).toContain("start");
    expect(result.stdout).toContain("watch");
    expect(result.stdout).toContain("stop");
  });
});
