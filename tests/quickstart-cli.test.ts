import { describe, expect, it } from "bun:test";
import {
  computeDefaultRenderConcurrency,
  defaultBucketLocationFromVertex,
  formatGiB,
  normalizeBucket,
  normalizeConcurrencyValue,
  parseProjectSelectionIndex,
} from "../cli/commands/quickstart";

describe("quickstart cli helpers", () => {
  it("normalizes bucket values", () => {
    expect(normalizeBucket("gs://vesai-demo")).toBe("vesai-demo");
    expect(normalizeBucket("  vesai-demo  ")).toBe("vesai-demo");
  });

  it("infers bucket location from vertex region", () => {
    expect(defaultBucketLocationFromVertex("us-central1")).toBe("US");
    expect(defaultBucketLocationFromVertex("eu-west1")).toBe("EU");
    expect(defaultBucketLocationFromVertex("asia-southeast1")).toBe("ASIA");
  });

  it("parses valid project selections", () => {
    expect(parseProjectSelectionIndex("1", 3)).toBe(0);
    expect(parseProjectSelectionIndex("3", 3)).toBe(2);
  });

  it("rejects invalid project selections", () => {
    expect(() => parseProjectSelectionIndex("0", 3)).toThrow(
      "Invalid project selection"
    );
    expect(() => parseProjectSelectionIndex("4", 3)).toThrow(
      "Invalid project selection"
    );
    expect(() => parseProjectSelectionIndex("abc", 3)).toThrow(
      "Invalid project selection"
    );
  });

  it("normalizes valid concurrency values and rejects invalid ones", () => {
    expect(
      normalizeConcurrencyValue(undefined, 2, "--max-concurrent-renders")
    ).toBe(2);
    expect(normalizeConcurrencyValue("4", 2, "--max-concurrent-renders")).toBe(
      4
    );
    expect(normalizeConcurrencyValue(16, 2, "--max-concurrent-renders")).toBe(
      16
    );

    expect(() =>
      normalizeConcurrencyValue("0", 2, "--max-concurrent-renders")
    ).toThrow("Must be a positive integer");
    expect(() =>
      normalizeConcurrencyValue("1.5", 2, "--max-concurrent-renders")
    ).toThrow("Must be a positive integer");
    expect(() =>
      normalizeConcurrencyValue("x", 2, "--max-concurrent-renders")
    ).toThrow("Must be a positive integer");
  });

  it("computes RAM-based default render concurrency", () => {
    // 8 GiB available -> 4 GiB budget -> 8 render workers at 512MB each
    expect(computeDefaultRenderConcurrency(8 * 1024 * 1024 * 1024)).toBe(8);
    // Always at least one
    expect(computeDefaultRenderConcurrency(0)).toBe(1);
    expect(formatGiB(8 * 1024 * 1024 * 1024)).toBe("8.0");
  });
});
