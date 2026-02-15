import { freemem } from "node:os";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import {
  DEFAULT_VERTEX_MODEL,
  ensureCoreDirectories,
  saveCoreConfig,
} from "../../config";
import {
  BYTES_PER_MIB,
  computeDefaultRenderMemoryMb,
  estimateRenderServiceCapacity,
  formatGiB,
  normalizePositiveIntegerValue,
  normalizeRenderMemoryMbValue,
  RENDER_MEMORY_PER_SERVICE_MB,
} from "../../config/runtime";
import {
  ensureBucket,
  ensurePlaywrightChromiumInstalled,
  ensureRequiredApis,
  getActiveGcloudAccount,
  getActiveGcloudProject,
  hasApplicationDefaultCredentials,
  isGcloudInstalled,
  normalizeBucketLocation,
} from "../../connectors";

export type QuickstartCommandOptions = {
  gcloudProjectId?: string;
  vertexLocation?: string;
  bucketLocation?: string;
  bucket?: string;
  maxRenderMemoryMb?: number;
  yes?: boolean;
  nonInteractive?: boolean;
};

type PromptClient = {
  ask: (prompt: string) => Promise<string>;
  close: () => void;
};

export function normalizeBucket(value: string): string {
  return value.replace(/^gs:\/\//, "").trim();
}

export function defaultBucketLocationFromVertex(location: string): string {
  const value = location.trim().toLowerCase();
  if (value.startsWith("eu-")) {
    return "EU";
  }
  if (value.startsWith("asia-")) {
    return "ASIA";
  }
  return "US";
}

export function normalizeConcurrencyValue(
  value: string | number | undefined,
  fallback: number,
  flag: string
): number {
  return normalizePositiveIntegerValue(value, fallback, flag);
}

export function parseProjectSelectionIndex(
  value: string,
  size: number
): number {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > size) {
    throw new Error(`Invalid project selection "${value}". Choose 1-${size}.`);
  }
  return parsed - 1;
}

function createPromptClient(): PromptClient {
  const rl = createInterface({ input, output });
  return {
    ask: async (prompt: string) => rl.question(prompt),
    close: () => rl.close(),
  };
}

async function resolveValue(params: {
  promptClient: PromptClient | null;
  label: string;
  flag: string;
  value: string | undefined;
  defaultValue?: string;
  required?: boolean;
  nonInteractive: boolean;
  useDefaultsWithoutPrompt: boolean;
}): Promise<string> {
  const required = params.required !== false;
  const direct = params.value?.trim();
  if (direct) {
    return direct;
  }

  if (params.useDefaultsWithoutPrompt && params.defaultValue !== undefined) {
    return params.defaultValue;
  }

  if (params.nonInteractive) {
    if (params.defaultValue !== undefined) {
      return params.defaultValue;
    }
    throw new Error(
      `Missing required option --${params.flag} in non-interactive mode.`
    );
  }

  if (!params.promptClient) {
    throw new Error(`Missing prompt client for --${params.flag}.`);
  }

  while (true) {
    const suffix = params.defaultValue ? ` [${params.defaultValue}]` : "";
    const raw = await params.promptClient.ask(`${params.label}${suffix}: `);
    const picked = raw.trim() || params.defaultValue || "";

    if (!required || picked) {
      return picked;
    }

    console.log(`${params.label} is required.`);
  }
}

export async function runQuickstartCli(
  options: QuickstartCommandOptions
): Promise<void> {
  const nonInteractive = Boolean(options.nonInteractive);
  const useDefaultsWithoutPrompt = Boolean(
    options.yes || options.nonInteractive
  );
  const promptClient = nonInteractive ? null : createPromptClient();

  try {
    console.log("VES AI quickstart (global core setup)");
    console.log("Running preflight checks...");

    if (!(await isGcloudInstalled())) {
      throw new Error("gcloud CLI is required but not installed.");
    }

    if (!(await getActiveGcloudAccount())) {
      throw new Error(
        "No active gcloud account. Run `gcloud auth login` before quickstart."
      );
    }

    const activeProjectId = await getActiveGcloudProject();
    if (!(activeProjectId || options.gcloudProjectId?.trim())) {
      throw new Error(
        "No active gcloud project. Run `gcloud config set project <id>` before quickstart."
      );
    }

    if (!(await hasApplicationDefaultCredentials())) {
      throw new Error(
        "Application default credentials are missing. Run `gcloud auth application-default login`."
      );
    }

    console.log("Ensuring Playwright Chromium is installed...");
    await ensurePlaywrightChromiumInstalled();

    const gcloudProjectId =
      options.gcloudProjectId?.trim() || activeProjectId || "";
    const availableRamBytes = freemem();
    const defaultRenderMemoryMb =
      computeDefaultRenderMemoryMb(availableRamBytes);
    const defaultRenderCapacity = estimateRenderServiceCapacity(
      defaultRenderMemoryMb
    );
    console.log(
      `Render memory budget default: ${defaultRenderMemoryMb} MiB (~${formatGiB(defaultRenderMemoryMb * BYTES_PER_MIB)} GiB, ~${defaultRenderCapacity} render services at ${RENDER_MEMORY_PER_SERVICE_MB} MiB each).`
    );

    const vertexLocation = await resolveValue({
      promptClient,
      label: "Vertex AI location",
      flag: "vertex-location",
      value: options.vertexLocation,
      defaultValue: "us-central1",
      nonInteractive,
      useDefaultsWithoutPrompt,
    });

    const defaultBucketLocation =
      defaultBucketLocationFromVertex(vertexLocation);
    const bucketLocationInput = await resolveValue({
      promptClient,
      label: "GCS bucket location (US, EU, ASIA, or regional)",
      flag: "bucket-location",
      value: options.bucketLocation,
      defaultValue: defaultBucketLocation,
      nonInteractive,
      useDefaultsWithoutPrompt,
    });
    const bucketLocation = normalizeBucketLocation(bucketLocationInput);

    const bucket = normalizeBucket(
      await resolveValue({
        promptClient,
        label: "GCS bucket name",
        flag: "bucket",
        value: options.bucket,
        defaultValue: `vesai-${gcloudProjectId}`,
        nonInteractive,
        useDefaultsWithoutPrompt,
      })
    );

    const maxRenderMemoryInput = await resolveValue({
      promptClient,
      label: `Max render memory budget in MiB (>=${RENDER_MEMORY_PER_SERVICE_MB})`,
      flag: "max-render-memory-mb",
      value:
        options.maxRenderMemoryMb === undefined
          ? undefined
          : String(options.maxRenderMemoryMb),
      defaultValue: String(defaultRenderMemoryMb),
      nonInteractive,
      useDefaultsWithoutPrompt,
    });
    const maxRenderMemoryMb = normalizeRenderMemoryMbValue(
      maxRenderMemoryInput,
      defaultRenderMemoryMb,
      "--max-render-memory-mb"
    );

    console.log("Provisioning core config and cloud resources...");
    await ensureCoreDirectories();
    await ensureRequiredApis(gcloudProjectId);
    await ensureBucket({
      bucket,
      projectId: gcloudProjectId,
      location: bucketLocation,
    });

    await saveCoreConfig({
      version: 1,
      gcloud: {
        projectId: gcloudProjectId,
        region: bucketLocation,
        bucket,
      },
      vertex: {
        model: DEFAULT_VERTEX_MODEL,
        location: vertexLocation,
      },
      runtime: {
        maxRenderMemoryMb,
      },
    });

    console.log("Global quickstart complete.");
    console.log("Next steps:");
    console.log("  1) cd <your-project>");
    console.log("  2) vesai init");
    console.log("  3) vesai daemon start");
  } finally {
    promptClient?.close();
  }
}
