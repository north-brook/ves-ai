import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

export type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

const GCLOUD_PYTHON_CANDIDATES = [
  "/usr/bin/python3",
  "/opt/homebrew/bin/python3",
  "/usr/local/bin/python3",
];

const GCLOUD_FALLBACK_PYTHON =
  process.platform === "win32"
    ? null
    : (GCLOUD_PYTHON_CANDIDATES.find((candidate) => existsSync(candidate)) ??
      null);

function resolveEnv(
  command: string,
  env: NodeJS.ProcessEnv | undefined
): NodeJS.ProcessEnv {
  const baseEnv = env ?? process.env;

  if (command !== "gcloud") {
    return baseEnv;
  }
  if (baseEnv.CLOUDSDK_PYTHON || !GCLOUD_FALLBACK_PYTHON) {
    return baseEnv;
  }

  return {
    ...baseEnv,
    CLOUDSDK_PYTHON: GCLOUD_FALLBACK_PYTHON,
  };
}

export async function runCommand(
  command: string,
  args: string[] = [],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv }
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: options?.cwd,
      env: resolveEnv(command, options?.env),
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 0,
      });
    });
  });
}

export async function runCommandOrThrow(
  command: string,
  args: string[] = [],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv }
): Promise<CommandResult> {
  const result = await runCommand(command, args, options);
  if (result.exitCode !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with code ${result.exitCode}: ${result.stderr || result.stdout}`
    );
  }
  return result;
}
