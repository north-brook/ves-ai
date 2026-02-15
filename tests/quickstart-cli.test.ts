import { describe, expect, it } from "bun:test";
import {
  defaultBucketLocationFromVertex,
  normalizeBucket,
  normalizeConcurrencyValue,
  parseProjectSelectionIndex,
} from "../cli/commands/quickstart";
import {
  computeDefaultRenderMemoryMb,
  estimateRenderServiceCapacity,
  formatGiB,
  normalizeRenderMemoryMbValue,
} from "../config/runtime";

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

  it("normalizes positive integer values", () => {
    expect(normalizeConcurrencyValue(undefined, 2, "--lookback-days")).toBe(2);
    expect(normalizeConcurrencyValue("4", 2, "--lookback-days")).toBe(4);
    expect(normalizeConcurrencyValue(16, 2, "--lookback-days")).toBe(16);

    expect(() => normalizeConcurrencyValue("0", 2, "--lookback-days")).toThrow(
      "Must be a positive integer"
    );
    expect(() =>
      normalizeConcurrencyValue("1.5", 2, "--lookback-days")
    ).toThrow("Must be a positive integer");
    expect(() => normalizeConcurrencyValue("x", 2, "--lookback-days")).toThrow(
      "Must be a positive integer"
    );
  });

  it("normalizes max render memory values", () => {
    expect(
      normalizeRenderMemoryMbValue(undefined, 4096, "--max-render-memory-mb")
    ).toBe(4096);
    expect(
      normalizeRenderMemoryMbValue("8192", 4096, "--max-render-memory-mb")
    ).toBe(8192);

    expect(() =>
      normalizeRenderMemoryMbValue("256", 4096, "--max-render-memory-mb")
    ).toThrow("Must be at least 512 MiB");
  });

  it("computes RAM-based default render memory and capacity", () => {
    // 8 GiB available -> 4 GiB budget
    expect(computeDefaultRenderMemoryMb(8 * 1024 * 1024 * 1024)).toBe(4096);
    expect(estimateRenderServiceCapacity(4096)).toBe(8);
    // Always at least one 512 MiB renderer budget
    expect(computeDefaultRenderMemoryMb(0)).toBe(512);
    expect(formatGiB(8 * 1024 * 1024 * 1024)).toBe("8.0");
  });
});
