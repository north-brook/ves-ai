import type { VesaiConfig } from "../config";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function deepMerge<T>(base: T, overrides?: DeepPartial<T>): T {
  if (!overrides) {
    return base;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = deepMerge(
        (base as Record<string, unknown>)[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      out[key] = value as unknown;
    }
  }
  return out as T;
}

export function makeConfig(overrides?: DeepPartial<VesaiConfig>): VesaiConfig {
  const base: VesaiConfig = {
    projectId: "5ab526cb-718f-4d6b-9226-0fdc9f31d8ef",
    posthog: {
      host: "https://us.posthog.com",
      apiKey: "phx_test",
      projectId: "12345",
      groupKey: "company_id",
      domainFilter: "example.com",
    },
    gcloud: {
      projectId: "test-project",
      region: "us-central1",
      bucket: "test-bucket",
    },
    vertex: {
      model: "gemini-3-pro-preview",
      location: "us-central1",
    },
    runtime: {
      maxRenderMemoryMb: 1024,
      lookbackDays: 180,
    },
    daemon: {
      lookbackDays: 180,
    },
    product: {
      description: "Test product",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    core: {
      version: 1,
      gcloud: {
        projectId: "test-project",
        region: "us-central1",
        bucket: "test-bucket",
      },
      vertex: {
        model: "gemini-3-pro-preview",
        location: "us-central1",
      },
      runtime: {
        maxRenderMemoryMb: 1024,
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    project: {
      version: 1,
      projectId: "5ab526cb-718f-4d6b-9226-0fdc9f31d8ef",
      posthog: {
        host: "https://us.posthog.com",
        apiKey: "phx_test",
        projectId: "12345",
        groupKey: "company_id",
        domainFilter: "example.com",
      },
      daemon: {
        lookbackDays: 180,
      },
      product: {
        description: "Test product",
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  };

  return deepMerge(base, overrides);
}
