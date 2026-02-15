import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { getVesaiCorePaths, resolveVesaiHome } from "../config";
import { computeDynamicRenderServiceCapacity } from "../config/runtime";

const LOCK_RETRY_MS = 200;
const STALE_LOCK_MAX_AGE_MS = 5 * 60 * 1000;

type LockMetadata = {
  pid?: number;
  token?: string;
};

type SlotLease = {
  lockPath: string;
  token: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeLimit(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }
  return Math.floor(value);
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function readLockMetadata(
  lockPath: string
): Promise<LockMetadata | null> {
  try {
    const raw = await readFile(lockPath, "utf8");
    return JSON.parse(raw) as LockMetadata;
  } catch {
    return null;
  }
}

async function tryReleaseStaleLock(lockPath: string): Promise<void> {
  let raw = "";
  try {
    raw = await readFile(lockPath, "utf8");
  } catch {
    return;
  }

  let metadata: LockMetadata | null = null;
  try {
    metadata = JSON.parse(raw) as LockMetadata;
  } catch {
    // Avoid racing on actively-written lock files. Only clear malformed locks
    // once they are old enough to be considered stale.
    try {
      const fileStats = await stat(lockPath);
      const ageMs = Date.now() - fileStats.mtimeMs;
      if (ageMs > STALE_LOCK_MAX_AGE_MS) {
        await rm(lockPath, { force: true });
      }
    } catch {
      // Ignore lock cleanup failures and retry on next polling pass.
    }
    return;
  }

  const pid = Number(metadata?.pid);
  if (Number.isFinite(pid) && pid > 0 && processExists(pid)) {
    return;
  }

  await rm(lockPath, { force: true });
}

async function tryAcquireSlot(params: {
  locksDir: string;
  limit: number;
  token: string;
}): Promise<SlotLease | null> {
  for (let slot = 0; slot < params.limit; slot++) {
    const lockPath = join(params.locksDir, `slot-${slot}.lock`);
    try {
      const handle = await open(lockPath, "wx");
      try {
        await handle.writeFile(
          JSON.stringify(
            {
              pid: process.pid,
              token: params.token,
              acquiredAt: new Date().toISOString(),
            },
            null,
            2
          ),
          "utf8"
        );
      } finally {
        await handle.close();
      }

      return {
        lockPath,
        token: params.token,
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST") {
        await tryReleaseStaleLock(lockPath);
        continue;
      }

      throw error;
    }
  }

  return null;
}

async function releaseSlot(lease: SlotLease): Promise<void> {
  try {
    const metadata = await readLockMetadata(lease.lockPath);
    if (metadata?.token && metadata.token !== lease.token) {
      return;
    }
  } catch {
    // Continue and best-effort remove lock.
  }

  await rm(lease.lockPath, { force: true });
}

export async function withGlobalRenderSlot<T>(params: {
  maxRenderMemoryMb: number;
  task: () => Promise<T>;
}): Promise<T> {
  const corePaths = getVesaiCorePaths(resolveVesaiHome());
  await mkdir(corePaths.renderLocksDir, { recursive: true });

  const token = randomUUID();
  let lease: SlotLease | null = null;

  while (!lease) {
    const dynamicLimit = normalizeLimit(
      computeDynamicRenderServiceCapacity({
        maxRenderMemoryMb: params.maxRenderMemoryMb,
      })
    );

    lease = await tryAcquireSlot({
      locksDir: corePaths.renderLocksDir,
      limit: dynamicLimit,
      token,
    });
    if (!lease) {
      await sleep(LOCK_RETRY_MS);
    }
  }

  try {
    return await params.task();
  } finally {
    await releaseSlot(lease);
  }
}
