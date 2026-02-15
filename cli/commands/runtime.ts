import {
  ensureVesaiDirectories,
  requireConfig,
  type VesaiConfig,
} from "../../config";
import { printJson } from "./helpers";

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
  await ensureVesaiDirectories();
  const config = await requireConfig();
  return { config };
}

export function resolveSessionConcurrency(
  options: ReplayRunOptions,
  config: VesaiConfig
): number {
  const override = toPositiveInt(options.maxConcurrent, "--max-concurrent");
  return override ?? config.runtime.maxConcurrentRenders;
}

export function shouldEmitJson(value: boolean | undefined): boolean {
  return value !== false;
}

export function printResult(value: unknown, json = true): void {
  if (json) {
    printJson(value);
    return;
  }

  if (typeof value === "string") {
    console.log(value);
    return;
  }

  console.log(JSON.stringify(value, null, 2));
}

function toNumberIfFinite(value: string): number | string {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return value;
}

export function mapRowToObject(
  columns: string[],
  row: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) {
    const key = columns[i] || `column_${i + 1}`;
    out[key] = toNumberIfFinite(row[i] ?? "");
  }
  return out;
}
