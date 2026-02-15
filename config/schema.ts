import { z } from "zod";
import { MIN_RENDER_MEMORY_MB } from "./runtime";

export const DEFAULT_VERTEX_MODEL = "gemini-3-pro-preview";

export const CoreConfigSchema = z.object({
  version: z.number().int().positive().default(1),
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
    maxRenderMemoryMb: z
      .number()
      .int()
      .min(MIN_RENDER_MEMORY_MB)
      .default(MIN_RENDER_MEMORY_MB * 2),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ProjectConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  projectId: z.string().uuid(),
  posthog: z.object({
    host: z.string().url().default("https://us.posthog.com"),
    apiKey: z.string().min(1),
    projectId: z.string().min(1),
    groupKey: z.string().min(1),
    domainFilter: z.string().min(1),
  }),
  daemon: z.object({
    lookbackDays: z.number().int().min(1).default(180),
  }),
  product: z.object({
    description: z.string().min(1),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CoreConfig = z.infer<typeof CoreConfigSchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export type VesaiConfig = {
  projectId: string;
  posthog: ProjectConfig["posthog"];
  gcloud: CoreConfig["gcloud"];
  vertex: CoreConfig["vertex"];
  runtime: {
    maxRenderMemoryMb: number;
    lookbackDays: number;
  };
  daemon: ProjectConfig["daemon"];
  product: ProjectConfig["product"];
  createdAt: string;
  updatedAt: string;
  core: CoreConfig;
  project: ProjectConfig;
};

export const PartialCoreConfigSchema = CoreConfigSchema.partial();
export const PartialProjectConfigSchema = ProjectConfigSchema.partial();
