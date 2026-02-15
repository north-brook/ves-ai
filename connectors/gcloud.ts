import { runCommand, runCommandOrThrow } from "./shell";

export const REQUIRED_GCLOUD_APIS = [
  "aiplatform.googleapis.com",
  "storage.googleapis.com",
] as const;

const BUCKET_MULTI_REGIONS = new Set(["us", "eu", "asia"]);

export async function isGcloudInstalled(): Promise<boolean> {
  const result = await runCommand("gcloud", ["--version"]);
  return result.exitCode === 0;
}

export async function getActiveGcloudAccount(): Promise<string | null> {
  const result = await runCommand("gcloud", [
    "auth",
    "list",
    "--filter=status:ACTIVE",
    "--format=value(account)",
  ]);

  if (result.exitCode !== 0 || !result.stdout) {
    return null;
  }
  return result.stdout.split("\n")[0] ?? null;
}

export async function getActiveGcloudProject(): Promise<string | null> {
  const result = await runCommand("gcloud", ["config", "get-value", "project"]);
  if (result.exitCode !== 0) {
    return null;
  }

  const project = result.stdout.trim();
  if (!project || project === "(unset)") {
    return null;
  }
  return project;
}

export async function hasApplicationDefaultCredentials(): Promise<boolean> {
  const result = await runCommand("gcloud", [
    "auth",
    "application-default",
    "print-access-token",
  ]);
  return result.exitCode === 0 && Boolean(result.stdout.trim());
}

export async function ensureRequiredApis(projectId: string): Promise<void> {
  await runCommandOrThrow("gcloud", [
    "services",
    "enable",
    ...REQUIRED_GCLOUD_APIS,
    "--project",
    projectId,
  ]);
}

export async function listBuckets(projectId: string): Promise<string[]> {
  const result = await runCommand("gcloud", [
    "storage",
    "buckets",
    "list",
    "--project",
    projectId,
    "--format=value(name)",
  ]);

  if (result.exitCode !== 0 || !result.stdout) {
    return [];
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^gs:\/\//, ""));
}

export async function bucketExists(bucket: string): Promise<boolean> {
  const normalized = bucket.replace(/^gs:\/\//, "");
  const result = await runCommand("gcloud", [
    "storage",
    "buckets",
    "describe",
    `gs://${normalized}`,
    "--format=value(name)",
  ]);

  return result.exitCode === 0;
}

export async function createBucket(params: {
  bucket: string;
  projectId: string;
  location: string;
}): Promise<void> {
  const normalized = params.bucket.replace(/^gs:\/\//, "");
  const location = normalizeBucketLocation(params.location);

  try {
    await runCommandOrThrow("gcloud", [
      "storage",
      "buckets",
      "create",
      `gs://${normalized}`,
      "--project",
      params.projectId,
      "--location",
      location,
      "--uniform-bucket-level-access",
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/location constraint is not valid/i.test(message)) {
      throw new Error(
        `Invalid GCS bucket location '${params.location}'. Use US, EU, ASIA, or a valid regional location such as us-central1.`
      );
    }
    throw error;
  }
}

export function normalizeBucketLocation(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  if (BUCKET_MULTI_REGIONS.has(lower)) {
    return lower.toUpperCase();
  }

  return lower;
}

export async function ensureBucket(params: {
  bucket: string;
  projectId: string;
  location: string;
}): Promise<void> {
  if (await bucketExists(params.bucket)) {
    return;
  }
  await createBucket(params);
}
