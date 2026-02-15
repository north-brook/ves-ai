import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureProjectDirectories } from "../config";
import {
  writeGroupMarkdown,
  writeSessionMarkdown,
  writeUserMarkdown,
} from "../workspace";

async function withTempHome(run: (homeDir: string) => Promise<void>) {
  const homeDir = await mkdtemp(join(tmpdir(), "vesai-workspace-test-"));
  try {
    await ensureProjectDirectories(homeDir);
    await run(homeDir);
  } finally {
    await rm(homeDir, { recursive: true, force: true });
  }
}

describe("workspace markdown writer", () => {
  it("writes session markdown with frontmatter", async () => {
    await withTempHome(async (homeDir) => {
      const path = await writeSessionMarkdown({
        id: "session_123",
        name: "Checkout Flow Session",
        frontmatter: {
          score: 78,
          health: "mixed",
        },
        body: "User attempted checkout and encountered friction.",
        homeDir,
      });

      const content = await readFile(path, "utf8");
      expect(path).toContain("/sessions/");
      expect(content).toContain("---");
      expect(content).toContain("score: 78");
      expect(content).toContain("# Checkout Flow Session");
    });
  });

  it("keeps deterministic output paths", async () => {
    await withTempHome(async (homeDir) => {
      const first = await writeUserMarkdown({
        id: "test@example.com",
        name: "test@example.com",
        frontmatter: { score: 80 },
        body: "First body",
        homeDir,
      });

      const second = await writeUserMarkdown({
        id: "test@example.com",
        name: "test@example.com",
        frontmatter: { score: 81 },
        body: "Updated body",
        homeDir,
      });

      expect(first).toBe(second);
      const content = await readFile(second, "utf8");
      expect(content).toContain("Updated body");
      expect(content).toContain("score: 81");
    });
  });

  it("writes group markdown to groups folder", async () => {
    await withTempHome(async (homeDir) => {
      const path = await writeGroupMarkdown({
        id: "group_abc",
        name: "group_abc",
        frontmatter: { users_analyzed: 3 },
        body: "Group-level adoption trends.",
        homeDir,
      });

      expect(path).toContain("/groups/");
    });
  });
});
