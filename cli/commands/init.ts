import { randomUUID } from "node:crypto";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import {
  ensureProjectDirectories,
  ensureProjectGitignore,
  ensureWorkspaceGitRepo,
  requireCoreConfig,
  saveProjectConfig,
} from "../../config";
import { listProjects, type PostHogProject } from "../../connectors";
import { normalizeConcurrencyValue } from "./quickstart";

export type InitCommandOptions = {
  projectId?: string;
  posthogHost?: string;
  posthogApiKey?: string;
  posthogProjectId?: string;
  posthogGroupKey?: string;
  domainFilter?: string;
  lookbackDays?: number;
  productDescription?: string;
  yes?: boolean;
  nonInteractive?: boolean;
};

type PromptClient = {
  ask: (prompt: string) => Promise<string>;
  close: () => void;
};

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

export async function runInitCli(options: InitCommandOptions): Promise<void> {
  const nonInteractive = Boolean(options.nonInteractive);
  const useDefaultsWithoutPrompt = Boolean(
    options.yes || options.nonInteractive
  );
  const promptClient = nonInteractive ? null : createPromptClient();

  try {
    console.log("VES AI init (project setup)");
    await requireCoreConfig();
    await ensureProjectGitignore(process.cwd());
    await ensureProjectDirectories(process.cwd());

    const generatedProjectId = options.projectId?.trim() || randomUUID();
    const projectId = await resolveValue({
      promptClient,
      label: "VES AI project id (UUID)",
      flag: "project-id",
      value: options.projectId,
      defaultValue: generatedProjectId,
      nonInteractive,
      useDefaultsWithoutPrompt,
    });

    const posthogHost = await resolveValue({
      promptClient,
      label: "PostHog host URL",
      flag: "posthog-host",
      value: options.posthogHost,
      defaultValue: "https://us.posthog.com",
      nonInteractive,
      useDefaultsWithoutPrompt,
    });

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

    const lookbackDaysInput = await resolveValue({
      promptClient,
      label: "Backfill lookback window in days (>=1)",
      flag: "lookback-days",
      value:
        options.lookbackDays === undefined
          ? undefined
          : String(options.lookbackDays),
      defaultValue: "180",
      nonInteractive,
      useDefaultsWithoutPrompt,
    });
    const lookbackDays = normalizeConcurrencyValue(
      lookbackDaysInput,
      180,
      "--lookback-days"
    );

    const productDescription = await resolveValue({
      promptClient,
      label: "Describe your product for better analysis",
      flag: "product-description",
      value: options.productDescription,
      nonInteractive,
      useDefaultsWithoutPrompt,
    });

    await saveProjectConfig({
      projectRoot: process.cwd(),
      config: {
        version: 1,
        projectId,
        posthog: {
          host: posthogHost,
          apiKey: posthogApiKey,
          projectId: posthogProjectId,
          groupKey: posthogGroupKey,
          domainFilter,
        },
        daemon: {
          lookbackDays,
        },
        product: {
          description: productDescription,
        },
      },
    });

    await ensureWorkspaceGitRepo(process.cwd());

    console.log("Project init complete.");
    console.log("Next steps:");
    console.log("  vesai daemon start");
    console.log("  vesai user you@example.com");
  } finally {
    promptClient?.close();
  }
}
