import { freemem } from "node:os";

export const BYTES_PER_MIB = 1024 * 1024;
export const BYTES_PER_GIB = 1024 * 1024 * 1024;

export const RENDER_MEMORY_PER_SERVICE_MB = 512;
export const MIN_RENDER_MEMORY_MB = RENDER_MEMORY_PER_SERVICE_MB;

const DEFAULT_RENDER_MEMORY_FRACTION = 0.5;
const DYNAMIC_FREE_MEMORY_UTILIZATION = 0.9;

export function formatGiB(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0.0";
  }
  return (bytes / BYTES_PER_GIB).toFixed(1);
}

export function normalizePositiveIntegerValue(
  value: string | number | undefined,
  fallback: number,
  flag: string
): number {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!(Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 1)) {
    throw new Error(
      `Invalid ${flag} value "${value}". Must be a positive integer.`
    );
  }
  return parsed;
}

export function normalizeRenderMemoryMbValue(
  value: string | number | undefined,
  fallbackMb: number,
  flag: string
): number {
  const parsed = normalizePositiveIntegerValue(value, fallbackMb, flag);
  if (parsed < MIN_RENDER_MEMORY_MB) {
    throw new Error(
      `Invalid ${flag} value "${value}". Must be at least ${MIN_RENDER_MEMORY_MB} MiB.`
    );
  }
  return parsed;
}

function normalizeRenderMemoryMb(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return MIN_RENDER_MEMORY_MB;
  }
  return Math.max(MIN_RENDER_MEMORY_MB, Math.floor(value));
}

export function computeDefaultRenderMemoryMb(
  availableRamBytes: number = freemem()
): number {
  if (!Number.isFinite(availableRamBytes) || availableRamBytes <= 0) {
    return MIN_RENDER_MEMORY_MB;
  }
  const budgetBytes = availableRamBytes * DEFAULT_RENDER_MEMORY_FRACTION;
  const budgetMb = Math.floor(budgetBytes / BYTES_PER_MIB);
  return normalizeRenderMemoryMb(budgetMb);
}

export function estimateRenderServiceCapacity(
  maxRenderMemoryMb: number
): number {
  const normalizedMb = normalizeRenderMemoryMb(maxRenderMemoryMb);
  return Math.max(1, Math.floor(normalizedMb / RENDER_MEMORY_PER_SERVICE_MB));
}

export function computeDynamicRenderServiceCapacity(params: {
  maxRenderMemoryMb: number;
  availableRamBytes?: number;
}): number {
  const configuredMb = normalizeRenderMemoryMb(params.maxRenderMemoryMb);
  const availableRamBytes =
    params.availableRamBytes === undefined
      ? freemem()
      : params.availableRamBytes;

  if (!Number.isFinite(availableRamBytes) || availableRamBytes <= 0) {
    return estimateRenderServiceCapacity(configuredMb);
  }

  const dynamicBudgetMb = Math.floor(
    (availableRamBytes * DYNAMIC_FREE_MEMORY_UTILIZATION) / BYTES_PER_MIB
  );
  const effectiveBudgetMb = Math.max(
    MIN_RENDER_MEMORY_MB,
    Math.min(configuredMb, dynamicBudgetMb)
  );

  return estimateRenderServiceCapacity(effectiveBudgetMb);
}

export function legacyConcurrencyToRenderMemoryMb(concurrency: number): number {
  const normalized = Math.max(1, Math.floor(concurrency));
  return normalized * RENDER_MEMORY_PER_SERVICE_MB;
}
