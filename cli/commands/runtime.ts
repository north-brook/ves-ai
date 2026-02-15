import {
  ensureCoreDirectories,
  ensureProjectDirectories,
  requireConfig,
  type VesaiConfig,
} from "../../config";
import { computeDynamicRenderServiceCapacity } from "../../config/runtime";

export type ReplayRunOptions = {
  json?: boolean;
  maxConcurrent?: number;
  verbose?: boolean;
};

export function toPositiveInt(
  value: unknown,
  label: string
): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!(Number.isInteger(parsed) && parsed > 0)) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

export async function withTemporaryEnv<T>(
  key: string,
  value: string,
  task: () => Promise<T>
): Promise<T> {
  const previous = process.env[key];
  process.env[key] = value;
  try {
    return await task();
  } finally {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
}

export async function withRenderLogMode<T>(
  verbose: boolean | undefined,
  task: () => Promise<T>
): Promise<T> {
  return withTemporaryEnv(
    "VESAI_SILENT_RENDER_LOGS",
    verbose ? "0" : "1",
    task
  );
}

export async function ensureReplayContext(): Promise<{ config: VesaiConfig }> {
  await ensureCoreDirectories();
  await ensureProjectDirectories();
  const config = await requireConfig();
  return { config };
}

export function resolveSessionConcurrency(
  options: ReplayRunOptions,
  config: VesaiConfig
): number {
  const override = toPositiveInt(options.maxConcurrent, "--max-concurrent");
  return (
    override ??
    computeDynamicRenderServiceCapacity({
      maxRenderMemoryMb: config.runtime.maxRenderMemoryMb,
    })
  );
}

export function shouldEmitJson(value: boolean | undefined): boolean {
  return value !== false;
}
