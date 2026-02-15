import type { VesaiConfig } from "../config";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export function makeConfig(overrides?: DeepPartial<VesaiConfig>): VesaiConfig {
  const base: VesaiConfig = {
    version: 1,
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
      maxConcurrentRenders: 2,
    },
    product: {
      description: "Test product",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  return {
    ...base,
    ...overrides,
    posthog: { ...base.posthog, ...(overrides?.posthog || {}) },
    gcloud: { ...base.gcloud, ...(overrides?.gcloud || {}) },
    vertex: { ...base.vertex, ...(overrides?.vertex || {}) },
    runtime: { ...base.runtime, ...(overrides?.runtime || {}) },
    product: { ...base.product, ...(overrides?.product || {}) },
  };
}
