import { freemem } from "node:os";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import {
  ensureVesaiDirectories,
  ensureWorkspaceGitRepo,
  saveConfig,
} from "../../../packages/config/src";
import {
  ensureBucket,
  ensurePlaywrightChromiumInstalled,
  ensureRequiredApis,
  getActiveGcloudAccount,
  getActiveGcloudProject,
  hasApplicationDefaultCredentials,
  isGcloudInstalled,
  listProjects,
  normalizeBucketLocation,
  type PostHogProject,
} from "../../../packages/connectors/src";

const POSTHOG_API_KEY_SCOPE_TEXT = "All access + MCP server scope";
const POSTHOG_API_KEY_SETTINGS_URL =
  "https://app.posthog.com/settings/user-api-keys";

export type QuickstartCommandOptions = {
  posthogHost?: string;
  posthogApiKey?: string;
  posthogProjectId?: string;
  posthogGroupKey?: string;
  domainFilter?: string;
  gcloudProjectId?: string;
  vertexLocation?: string;
  bucketLocation?: string;
  bucket?: string;
  maxConcurrentRenders?: number;
  productDescription?: string;
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

const BYTES_PER_GIB = 1024 * 1024 * 1024;
const BYTES_PER_RENDER_INSTANCE = 512 * 1024 * 1024;

export function computeDefaultRenderConcurrency(
  availableRamBytes: number = freemem()
): number {
  if (!Number.isFinite(availableRamBytes) || availableRamBytes <= 0) {
    return 1;
  }
  const budget = availableRamBytes * 0.5;
  return Math.max(1, Math.floor(budget / BYTES_PER_RENDER_INSTANCE));
}

export function formatGiB(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0.0";
  }
  return (bytes / BYTES_PER_GIB).toFixed(1);
}

export function normalizeConcurrencyValue(
  value: string | number | undefined,
  fallback: number,
  flag: string
): number {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!(Number.isFinite(parsed) && Number.isInteger(parsed))) {
    throw new Error(
      `Invalid ${flag} value "${value}". Must be a positive integer.`
    );
  }

  if (parsed < 1) {
    throw new Error(
      `Invalid ${flag} value "${value}". Must be a positive integer.`
    );
  }

  return parsed;
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

    if (!required) {
      return picked;
    }

    if (picked) {
      return picked;
    }

    console.log(`${params.label} is required.`);
  }
}

async function choosePostHogProjectId(params: {
  projects: PostHogProject[];
  optionValue: string | undefined;
  nonInteractive: boolean;
  promptClient: PromptClient | null;
  useDefaultsWithoutPrompt: boolean;
}): Promise<string> {
  const normalizedOption = params.optionValue?.trim();
  if (normalizedOption) {
    const exists = params.projects.some(
      (project) => String(project.id) === normalizedOption
    );
    if (!exists) {
      const available = params.projects
        .map((project) => `${project.name} (${project.id})`)
        .join(", ");
      throw new Error(
        `Unknown PostHog project id "${normalizedOption}". Available projects: ${available}`
      );
    }
    return normalizedOption;
  }

  if (params.useDefaultsWithoutPrompt) {
    return String(params.projects[0]!.id);
  }

  if (params.nonInteractive) {
    throw new Error(
      "Missing required option --posthog-project-id in non-interactive mode."
    );
  }

  if (!params.promptClient) {
    throw new Error("Prompt client unavailable for project selection.");
  }

  console.log("");
  console.log("Available PostHog projects:");
  for (let i = 0; i < params.projects.length; i++) {
    const project = params.projects[i]!;
    console.log(`  ${i + 1}. ${project.name} (${project.id})`);
  }

  while (true) {
    const raw = await params.promptClient.ask("Select project number [1]: ");
    const selection = raw.trim() || "1";
    try {
      const index = parseProjectSelectionIndex(
        selection,
        params.projects.length
      );
      return String(params.projects[index]!.id);
    } catch (error) {
      console.log(error instanceof Error ? error.message : String(error));
    }
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
    console.log("VESAI quickstart (CLI)");
    console.log("Running preflight checks...");

    const gcloudInstalled = await isGcloudInstalled();
    if (!gcloudInstalled) {
      throw new Error("gcloud CLI is required but not installed.");
    }

    const account = await getActiveGcloudAccount();
    if (!account) {
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

    const hasAdc = await hasApplicationDefaultCredentials();
    if (!hasAdc) {
      throw new Error(
        "Application default credentials are missing. Run `gcloud auth application-default login`."
      );
    }

    console.log("Ensuring Playwright Chromium is installed...");
    await ensurePlaywrightChromiumInstalled();

    const gcloudProjectId =
      options.gcloudProjectId?.trim() || activeProjectId || "";
    const availableRamBytes = freemem();
    const defaultRenderConcurrency =
      computeDefaultRenderConcurrency(availableRamBytes);
    console.log(
      `Render concurrency default: ${defaultRenderConcurrency} (~50% of ${formatGiB(availableRamBytes)} GiB available RAM at ~512MB per renderer).`
    );

    const posthogHost = await resolveValue({
      promptClient,
      label: "PostHog host URL",
      flag: "posthog-host",
      value: options.posthogHost,
      defaultValue: "https://us.posthog.com",
      nonInteractive,
      useDefaultsWithoutPrompt,
    });

    console.log("");
    console.log(`PostHog API key requirements: ${POSTHOG_API_KEY_SCOPE_TEXT}`);
    console.log(`Create key: ${POSTHOG_API_KEY_SETTINGS_URL}`);

    const posthogApiKey = await resolveValue({
      promptClient,
      label: "PostHog API key",
      flag: "posthog-api-key",
      value: options.posthogApiKey,
      nonInteractive,
      useDefaultsWithoutPrompt,
    });

    console.log("Loading PostHog projects...");
    const projects = await listProjects({
      host: posthogHost,
      apiKey: posthogApiKey,
    });

    if (!projects.length) {
      throw new Error("No PostHog projects found with this key.");
    }

    const posthogProjectId = await choosePostHogProjectId({
      projects,
      optionValue: options.posthogProjectId,
      nonInteractive,
      promptClient,
      useDefaultsWithoutPrompt,
    });

    const posthogGroupKey = await resolveValue({
      promptClient,
      label: "PostHog group key",
      flag: "posthog-group-key",
      value: options.posthogGroupKey,
      defaultValue: "company_id",
      nonInteractive,
      useDefaultsWithoutPrompt,
    });

    const domainFilter = await resolveValue({
      promptClient,
      label: "Domain filter for session replays",
      flag: "domain-filter",
      value: options.domainFilter,
      nonInteractive,
      useDefaultsWithoutPrompt,
    });

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

    const maxConcurrentRendersInput = await resolveValue({
      promptClient,
      label: "Max concurrent renders (>=1)",
      flag: "max-concurrent-renders",
      value:
        options.maxConcurrentRenders === undefined
          ? undefined
          : String(options.maxConcurrentRenders),
      defaultValue: String(defaultRenderConcurrency),
      nonInteractive,
      useDefaultsWithoutPrompt,
    });
    const maxConcurrentRenders = normalizeConcurrencyValue(
      maxConcurrentRendersInput,
      2,
      "--max-concurrent-renders"
    );

    const productDescription = await resolveValue({
      promptClient,
      label: "Describe your product for better analysis",
      flag: "product-description",
      value: options.productDescription,
      nonInteractive,
      useDefaultsWithoutPrompt,
    });

    console.log("Provisioning local config and cloud resources...");
    await ensureVesaiDirectories();
    await ensureWorkspaceGitRepo();
    await ensureRequiredApis(gcloudProjectId);
    await ensureBucket({
      bucket,
      projectId: gcloudProjectId,
      location: bucketLocation,
    });

    await saveConfig({
      version: 1,
      posthog: {
        host: posthogHost,
        apiKey: posthogApiKey,
        projectId: posthogProjectId,
        groupKey: posthogGroupKey,
        domainFilter,
      },
      gcloud: {
        projectId: gcloudProjectId,
        region: bucketLocation,
        bucket,
      },
      vertex: {
        model: "gemini-3-pro",
        location: vertexLocation,
      },
      runtime: {
        maxConcurrentRenders,
      },
      product: {
        description: productDescription,
      },
    });

    console.log("Quickstart complete.");
    console.log("Next steps:");
    console.log("  vesai daemon start");
    console.log("  vesai replays user you@example.com");
  } finally {
    promptClient?.close();
  }
}
