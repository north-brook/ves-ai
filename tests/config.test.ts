import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureVesaiDirectories,
  ensureWorkspaceGitRepo,
  getVesaiPaths,
  loadConfig,
  saveConfig,
  updateConfig,
} from "../packages/config/src";
import { makeConfig } from "./helpers";

async function withTempHome(run: (homeDir: string) => Promise<void>) {
  const homeDir = await mkdtemp(join(tmpdir(), "vesai-config-test-"));
  try {
    await run(homeDir);
  } finally {
    await rm(homeDir, { recursive: true, force: true });
  }
}

describe("config", () => {
  it("creates required ~/.vesai directories", async () => {
    await withTempHome(async (homeDir) => {
      await ensureVesaiDirectories(homeDir);
      const paths = getVesaiPaths(homeDir);

      await stat(paths.home);
      await stat(paths.workspace);
      await stat(paths.sessionsDir);
      await stat(paths.usersDir);
      await stat(paths.groupsDir);
      await stat(paths.jobsDir);
      await stat(paths.cacheDir);
      await stat(paths.logsDir);
      await stat(paths.tmpDir);
    });
  });

  it("saves, loads, and updates vesai config", async () => {
    await withTempHome(async (homeDir) => {
      const config = makeConfig();
      const {
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...withoutTimestamps
      } = config;
      await saveConfig(withoutTimestamps, homeDir);

      const loaded = await loadConfig(homeDir);
      expect(loaded.posthog.projectId).toBe("12345");
      expect(loaded.createdAt.length).toBeGreaterThan(0);
      expect(loaded.updatedAt.length).toBeGreaterThan(0);

      const updated = await updateConfig({
        homeDir,
        updater: (current) => ({
          ...current,
          runtime: {
            ...current.runtime,
            maxConcurrentRenders: 4,
          },
        }),
      });

      expect(updated.runtime.maxConcurrentRenders).toBe(4);
      const reloaded = await loadConfig(homeDir);
      expect(reloaded.runtime.maxConcurrentRenders).toBe(4);
    });
  });

  it("initializes git-ready workspace", async () => {
    await withTempHome(async (homeDir) => {
      await ensureVesaiDirectories(homeDir);
      await ensureWorkspaceGitRepo(homeDir);

      const paths = getVesaiPaths(homeDir);
      const head = await readFile(
        join(paths.workspace, ".git", "HEAD"),
        "utf8"
      );
      const gitignore = await readFile(
        join(paths.workspace, ".gitignore"),
        "utf8"
      );

      expect(head.length).toBeGreaterThan(0);
      expect(gitignore).toContain(".DS_Store");
    });
  });
});
