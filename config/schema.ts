import { z } from "zod";

export const DEFAULT_VERTEX_MODEL = "gemini-3-pro-preview";

export const VesaiConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  posthog: z.object({
    host: z.string().url().default("https://us.posthog.com"),
    apiKey: z.string().min(1),
    projectId: z.string().min(1),
    groupKey: z.string().min(1),
    domainFilter: z.string().min(1),
  }),
  gcloud: z.object({
    projectId: z.string().min(1),
    region: z.string().min(1).default("us-central1"),
    bucket: z.string().min(3),
  }),
  vertex: z.object({
    model: z.string().min(1).default(DEFAULT_VERTEX_MODEL),
    location: z.string().min(1).default("us-central1"),
  }),
  runtime: z.object({
    maxConcurrentRenders: z.number().int().min(1).default(2),
  }),
  product: z.object({
    description: z.string().min(1),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type VesaiConfig = z.infer<typeof VesaiConfigSchema>;

export const PartialVesaiConfigSchema = VesaiConfigSchema.partial();
