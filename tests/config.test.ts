import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureCoreDirectories,
  ensureProjectDirectories,
  ensureProjectGitignore,
  ensureWorkspaceGitRepo,
  getVesaiCorePaths,
  getVesaiPaths,
  loadConfig,
  loadCoreConfig,
  saveCoreConfig,
  saveProjectConfig,
  updateCoreConfig,
  updateProjectConfig,
} from "../config";
import { makeConfig } from "./helpers";

async function withTempDir(
  prefix: string,
  run: (dir: string) => Promise<void>
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("config", () => {
  it("creates required core and project directories", async () => {
    await withTempDir("vesai-core-test-", async (homeDir) => {
      await ensureCoreDirectories(homeDir);
      const corePaths = getVesaiCorePaths(homeDir);

      await stat(corePaths.home);
      await stat(corePaths.logsDir);
      await stat(corePaths.tmpDir);
      await stat(corePaths.renderLocksDir);
    });

    await withTempDir("vesai-project-test-", async (projectRoot) => {
      await ensureProjectDirectories(projectRoot);
      const paths = getVesaiPaths(projectRoot);

      await stat(paths.vesaiDir);
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

  it("saves, loads, and updates merged core + project config", async () => {
    await withTempDir("vesai-core-test-", async (homeDir) => {
      await withTempDir("vesai-project-test-", async (projectRoot) => {
        const config = makeConfig();

        const {
          createdAt: _coreCreatedAt,
          updatedAt: _coreUpdatedAt,
          ...coreWithoutTimestamps
        } = config.core;
        await saveCoreConfig(coreWithoutTimestamps, homeDir);

        const {
          createdAt: _projectCreatedAt,
          updatedAt: _projectUpdatedAt,
          ...projectWithoutTimestamps
        } = config.project;
        await saveProjectConfig({
          config: projectWithoutTimestamps,
          projectRoot,
        });

        process.env.VESAI_HOME = homeDir;
        const loaded = await loadConfig(projectRoot);
        expect(loaded.posthog.projectId).toBe("12345");
        expect(loaded.runtime.lookbackDays).toBe(180);
        expect(loaded.runtime.maxRenderMemoryMb).toBe(1024);

        const updatedCore = await updateCoreConfig({
          homeDir,
          updater: (current) => ({
            ...current,
            runtime: { ...current.runtime, maxRenderMemoryMb: 2048 },
          }),
        });
        expect(updatedCore.runtime.maxRenderMemoryMb).toBe(2048);

        const updatedProject = await updateProjectConfig({
          projectRoot,
          updater: (current) => ({
            ...current,
            daemon: { ...current.daemon, lookbackDays: 90 },
          }),
        });
        expect(updatedProject.daemon.lookbackDays).toBe(90);

        const reloaded = await loadConfig(projectRoot);
        expect(reloaded.runtime.maxRenderMemoryMb).toBe(2048);
        expect(reloaded.runtime.lookbackDays).toBe(90);
        delete process.env.VESAI_HOME;
      });
    });
  });

  it("migrates legacy maxConcurrentRenders core config on load", async () => {
    await withTempDir("vesai-core-test-", async (homeDir) => {
      const corePaths = getVesaiCorePaths(homeDir);
      await ensureCoreDirectories(homeDir);
      await writeFile(
        corePaths.coreConfigFile,
        JSON.stringify(
          {
            version: 1,
            gcloud: {
              projectId: "legacy-project",
              region: "us-central1",
              bucket: "legacy-bucket",
            },
            vertex: {
              model: "gemini-3-pro-preview",
              location: "us-central1",
            },
            runtime: {
              maxConcurrentRenders: 3,
            },
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          null,
          2
        ),
        "utf8"
      );

      const loaded = await loadCoreConfig(homeDir);
      expect(loaded.runtime.maxRenderMemoryMb).toBe(1536);
    });
  });

  it("initializes git-ready workspace inside project .vesai", async () => {
    await withTempDir("vesai-project-test-", async (projectRoot) => {
      await ensureProjectDirectories(projectRoot);
      await ensureWorkspaceGitRepo(projectRoot);

      const paths = getVesaiPaths(projectRoot);
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

  it("ensures .vesai is added to project root .gitignore", async () => {
    await withTempDir("vesai-project-test-", async (projectRoot) => {
      const gitignorePath = join(projectRoot, ".gitignore");
      await writeFile(gitignorePath, "node_modules/\n", "utf8");

      await ensureProjectGitignore(projectRoot);
      await ensureProjectGitignore(projectRoot);

      const gitignore = await readFile(gitignorePath, "utf8");
      expect(gitignore).toContain(".vesai/");
      expect(gitignore.match(/\.vesai\//g)?.length).toBe(1);
    });
  });
});
