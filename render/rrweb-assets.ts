import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const requireFromHere = createRequire(import.meta.url);

export type RrwebAssets = {
  script: string;
  css: string;
};

export type RrwebAssetCandidates = {
  scriptCandidates: string[];
  cssCandidates: string[];
};

export function getRrwebAssetCandidates(distDir: string): RrwebAssetCandidates {
  return {
    // rrweb-all.* existed in older rrweb builds; rrweb.umd.* is current in v2.
    scriptCandidates: [
      join(distDir, "rrweb-all.js"),
      join(distDir, "rrweb.umd.min.cjs"),
      join(distDir, "rrweb.umd.cjs"),
    ],
    cssCandidates: [
      join(distDir, "rrweb-all.css"),
      join(distDir, "style.css"),
      join(distDir, "style.min.css"),
    ],
  };
}

async function readFirstExistingFile(
  candidates: string[],
  label: "script" | "css"
): Promise<string> {
  for (const filePath of candidates) {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Unable to locate rrweb ${label} asset. Tried: ${candidates.join(", ")}`
  );
}

export async function readRrwebAssets(
  resolveRrwebEntry: () => string = () => requireFromHere.resolve("rrweb")
): Promise<RrwebAssets> {
  const rrwebEntry = resolveRrwebEntry();
  const rrwebDistDir = dirname(rrwebEntry);
  const candidates = getRrwebAssetCandidates(rrwebDistDir);

  const [script, css] = await Promise.all([
    readFirstExistingFile(candidates.scriptCandidates, "script"),
    readFirstExistingFile(candidates.cssCandidates, "css"),
  ]);

  return { script, css };
}
