import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  findProjectRoot,
  getVesaiCorePaths,
  getVesaiPaths,
  resolveProjectRoot,
  resolveVesaiHome,
} from "../config/paths";

describe("paths", () => {
  it("resolves VESAI_HOME override for core paths", () => {
    const previous = process.env.VESAI_HOME;
    process.env.VESAI_HOME = "/tmp/custom-vesai-home";

    const resolved = resolveVesaiHome();
    const paths = getVesaiCorePaths(resolved);

    expect(resolved).toBe("/tmp/custom-vesai-home");
    expect(paths.coreConfigFile).toBe("/tmp/custom-vesai-home/core.json");
    expect(paths.renderLocksDir).toBe("/tmp/custom-vesai-home/render-locks");

    if (previous === undefined) {
      delete process.env.VESAI_HOME;
    } else {
      process.env.VESAI_HOME = previous;
    }
  });

  it("finds and resolves project root from nested directory", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "vesai-paths-project-"));
    const nested = join(projectRoot, "apps", "web");

    try {
      await mkdir(join(projectRoot, ".vesai"), { recursive: true });
      await mkdir(nested, { recursive: true });
      await writeFile(
        join(projectRoot, ".vesai", "project.json"),
        "{}",
        "utf8"
      );

      const found = findProjectRoot(nested);
      expect(found).toBe(projectRoot);
      expect(resolveProjectRoot(nested)).toBe(projectRoot);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("builds project-scoped .vesai paths", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "vesai-paths-project-"));
    try {
      const paths = getVesaiPaths(projectRoot);
      expect(paths.configFile).toBe(
        join(projectRoot, ".vesai", "project.json")
      );
      expect(paths.sessionsDir).toBe(
        join(projectRoot, ".vesai", "workspace", "sessions")
      );
      expect(paths.daemonStateFile).toBe(
        join(projectRoot, ".vesai", "daemon-state.json")
      );
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
