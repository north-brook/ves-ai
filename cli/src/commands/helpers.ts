import { readFile } from "node:fs/promises";
import { getVesaiPaths } from "../../../packages/config/src";

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
