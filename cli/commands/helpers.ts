import { readFile } from "node:fs/promises";
import type { VesaiConfig } from "../../config";
import { getVesaiPaths } from "../../config";

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export async function getDaemonStatus(homeDir?: string): Promise<{
  running: boolean;
  pid?: number;
}> {
  const paths = getVesaiPaths(homeDir);
  try {
    const raw = await readFile(paths.daemonPidFile, "utf8");
    const pid = Number(raw.trim());
    if (!Number.isFinite(pid)) {
      return { running: false };
    }

    try {
      process.kill(pid, 0);
      return { running: true, pid };
    } catch {
      return { running: false };
    }
  } catch {
    return { running: false };
  }
}

function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.length <= 8) {
    return "*".repeat(Math.max(4, trimmed.length));
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

export function redactConfigSecrets(config: VesaiConfig): VesaiConfig {
  return {
    ...config,
    posthog: {
      ...config.posthog,
      apiKey: maskSecret(config.posthog.apiKey),
    },
  };
}
