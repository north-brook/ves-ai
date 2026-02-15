import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getRrwebAssetCandidates,
  readRrwebAssets,
} from "../render/rrweb-assets";

let tmpRoot: string | null = null;

afterEach(async () => {
  if (tmpRoot) {
    await rm(tmpRoot, { recursive: true, force: true });
    tmpRoot = null;
  }
});

describe("rrweb assets", () => {
  it("falls back to rrweb v2 UMD + style assets when rrweb-all.* is absent", async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), "vesai-rrweb-assets-"));
    const distDir = join(tmpRoot, "dist");
    await mkdir(distDir, { recursive: true });

    await writeFile(
      join(distDir, "rrweb.umd.min.cjs"),
      "window.rrweb = { Replayer: function() {} };",
      "utf8"
    );
    await writeFile(
      join(distDir, "style.css"),
      ".rrweb { color: black; }",
      "utf8"
    );

    const assets = await readRrwebAssets(() => join(distDir, "rrweb.cjs"));

    expect(assets.script).toContain("window.rrweb");
    expect(assets.css).toContain(".rrweb");
  });

  it("returns candidate lists that include legacy and v2 filenames", () => {
    const candidates = getRrwebAssetCandidates("/tmp/rrweb/dist");
    expect(candidates.scriptCandidates).toEqual([
      "/tmp/rrweb/dist/rrweb-all.js",
      "/tmp/rrweb/dist/rrweb.umd.min.cjs",
      "/tmp/rrweb/dist/rrweb.umd.cjs",
    ]);
    expect(candidates.cssCandidates).toEqual([
      "/tmp/rrweb/dist/rrweb-all.css",
      "/tmp/rrweb/dist/style.css",
      "/tmp/rrweb/dist/style.min.css",
    ]);
  });

  it("throws clear errors when rrweb assets are missing", async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), "vesai-rrweb-assets-missing-"));
    const distDir = join(tmpRoot, "dist");
    await mkdir(distDir, { recursive: true });

    await expect(async () => {
      await readRrwebAssets(() => join(distDir, "rrweb.cjs"));
    }).toThrow(/Unable to locate rrweb (script|css) asset/);
  });
});
