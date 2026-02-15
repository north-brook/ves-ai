import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getVesaiPaths } from "../config";

export type DaemonState = {
  version: 1;
  lastPulledAt?: string;
  backfillStartedAt?: string;
  backfillCompletedAt?: string;
  pendingUserEmails: string[];
  pendingGroupIds: string[];
  updatedAt: string;
};

function getDefaultState(): DaemonState {
  return {
    version: 1,
    pendingUserEmails: [],
    pendingGroupIds: [],
    updatedAt: new Date().toISOString(),
  };
}

function normalizeUnique(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

export async function loadDaemonState(homeDir?: string): Promise<DaemonState> {
  const paths = getVesaiPaths(homeDir);
  try {
    const raw = await readFile(paths.daemonStateFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<DaemonState>;

    return {
      version: 1,
      lastPulledAt: parsed.lastPulledAt,
      backfillStartedAt: parsed.backfillStartedAt,
      backfillCompletedAt: parsed.backfillCompletedAt,
      pendingUserEmails: normalizeUnique(parsed.pendingUserEmails || []),
      pendingGroupIds: normalizeUnique(parsed.pendingGroupIds || []),
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return getDefaultState();
  }
}

export async function saveDaemonState(
  state: DaemonState,
  homeDir?: string
): Promise<void> {
  const paths = getVesaiPaths(homeDir);
  await mkdir(dirname(paths.daemonStateFile), { recursive: true });

  const normalized: DaemonState = {
    ...state,
    version: 1,
    pendingUserEmails: normalizeUnique(state.pendingUserEmails),
    pendingGroupIds: normalizeUnique(state.pendingGroupIds),
    updatedAt: new Date().toISOString(),
  };

  await writeFile(
    paths.daemonStateFile,
    JSON.stringify(normalized, null, 2),
    "utf8"
  );
}

export async function updateDaemonState(params: {
  homeDir?: string;
  updater: (state: DaemonState) => DaemonState;
}): Promise<DaemonState> {
  const current = await loadDaemonState(params.homeDir);
  const next = params.updater(current);
  await saveDaemonState(next, params.homeDir);
  return loadDaemonState(params.homeDir);
}
