import { describe, expect, it } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getVesaiCorePaths } from "../config";
import { withGlobalRenderSlot } from "../render/global-render-slot";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withTempVesaiHome(
  run: (homeDir: string) => Promise<void>
): Promise<void> {
  const homeDir = await mkdtemp(join(tmpdir(), "vesai-lock-test-"));
  const previous = process.env.VESAI_HOME;
  process.env.VESAI_HOME = homeDir;

  try {
    await run(homeDir);
  } finally {
    if (previous === undefined) {
      delete process.env.VESAI_HOME;
    } else {
      process.env.VESAI_HOME = previous;
    }
    await rm(homeDir, { recursive: true, force: true });
  }
}

describe("global render slot", () => {
  it("releases lock files after task completes", async () => {
    await withTempVesaiHome(async (homeDir) => {
      const paths = getVesaiCorePaths(homeDir);

      await withGlobalRenderSlot({
        maxRenderMemoryMb: 512,
        task: async () => {
          const files = await readdir(paths.renderLocksDir);
          expect(files.length).toBe(1);
          expect(files[0]).toBe("slot-0.lock");
        },
      });

      const filesAfter = await readdir(paths.renderLocksDir);
      expect(filesAfter.length).toBe(0);
    });
  });

  it("serializes work when limit is one", async () => {
    await withTempVesaiHome(async () => {
      let releaseFirst: () => void = () => {};
      const firstGate = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });

      const first = withGlobalRenderSlot({
        maxRenderMemoryMb: 512,
        task: async () => {
          await firstGate;
        },
      });

      await sleep(120);

      let secondEnteredAt = 0;
      const second = withGlobalRenderSlot({
        maxRenderMemoryMb: 512,
        task: async () => {
          secondEnteredAt = Date.now();
        },
      });

      await sleep(120);
      expect(secondEnteredAt).toBe(0);

      releaseFirst();
      await first;
      await second;

      expect(secondEnteredAt).toBeGreaterThan(0);
    });
  });
});
