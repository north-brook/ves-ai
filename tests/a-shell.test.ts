import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

beforeEach(() => {
  mock.restore();
});

afterEach(() => {
  mock.restore();
});

async function loadShellConnector() {
  return import(
    `../packages/connectors/src/shell?cachebust=${Date.now()}-${Math.random()}`
  );
}

describe("shell connector", () => {
  it("executes commands and returns output", async () => {
    const { runCommand } = await loadShellConnector();
    const result = await runCommand("zsh", ["-lc", "echo ok"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("ok");
  });

  it("throws when command exits non-zero", async () => {
    const { runCommandOrThrow } = await loadShellConnector();
    let thrown = false;

    try {
      await runCommandOrThrow("zsh", ["-lc", "exit 2"]);
    } catch (error) {
      thrown = true;
      expect(String(error)).toContain("failed with code 2");
    }

    expect(thrown).toBe(true);
  });

  it("sets fallback CLOUDSDK_PYTHON for gcloud when unset", async () => {
    const { runCommand } = await loadShellConnector();
    const dir = mkdtempSync(join(tmpdir(), "vesai-gcloud-env-"));
    try {
      const gcloudPath = join(dir, "gcloud");
      writeFileSync(
        gcloudPath,
        '#!/usr/bin/env bash\necho "${CLOUDSDK_PYTHON:-}"\n',
        {
          mode: 0o755,
        }
      );

      const env: NodeJS.ProcessEnv = {
        ...process.env,
        PATH: `${dir}:${process.env.PATH ?? ""}`,
      };
      delete env.CLOUDSDK_PYTHON;

      const result = await runCommand("gcloud", [], { env });
      const expected =
        [
          "/usr/bin/python3",
          "/opt/homebrew/bin/python3",
          "/usr/local/bin/python3",
        ].find((candidate) => existsSync(candidate)) ?? "";

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(expected);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not override explicit CLOUDSDK_PYTHON for gcloud", async () => {
    const { runCommand } = await loadShellConnector();
    const dir = mkdtempSync(join(tmpdir(), "vesai-gcloud-env-"));
    try {
      const gcloudPath = join(dir, "gcloud");
      writeFileSync(
        gcloudPath,
        '#!/usr/bin/env bash\necho "${CLOUDSDK_PYTHON:-}"\n',
        {
          mode: 0o755,
        }
      );

      const env: NodeJS.ProcessEnv = {
        ...process.env,
        PATH: `${dir}:${process.env.PATH ?? ""}`,
        CLOUDSDK_PYTHON: "/custom/python3",
      };

      const result = await runCommand("gcloud", [], { env });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("/custom/python3");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
