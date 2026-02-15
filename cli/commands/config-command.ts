import type { Command } from "commander";
import {
  loadCoreConfig,
  loadProjectConfig,
  requireCoreConfig,
  updateCoreConfig,
  updateProjectConfig,
} from "../../config";
import { printJson } from "./helpers";

type ConfigShowOptions = {
  showSecrets?: boolean;
};

function setNestedValue(
  root: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const keys = path.split(".").filter(Boolean);
  if (!keys.length) {
    throw new Error("Invalid config path");
  }

  let current = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    const existing = current[key];
    if (!existing || typeof existing !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]!] = value;
}

function parseScalarValue(raw: string): unknown {
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  if (!Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return raw;
}

function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.length <= 8) {
    return "*".repeat(Math.max(4, trimmed.length));
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

export function registerConfigCommand(program: Command): void {
  const configCmd = program.command("config").description("Config commands");

  configCmd.addHelpText(
    "after",
    `
Examples:
  $ vesai config show
  $ vesai config show --show-secrets
  $ vesai config validate
  $ vesai config set core.runtime.maxRenderMemoryMb 8192
  $ vesai config set project.daemon.lookbackDays 180
`
  );

  configCmd
    .command("show")
    .description("Show current core and project config")
    .option(
      "--show-secrets",
      "Show sensitive values (default redacts credentials)"
    )
    .action(async (options: ConfigShowOptions) => {
      const core = await loadCoreConfig();
      const project = await loadProjectConfig().catch(() => null);
      let projectOutput: typeof project | null = null;

      if (project) {
        if (options.showSecrets) {
          projectOutput = project;
        } else {
          projectOutput = {
            ...project,
            posthog: {
              ...project.posthog,
              apiKey: maskSecret(project.posthog.apiKey),
            },
          };
        }
      }

      const output = {
        core,
        project: projectOutput,
      };

      printJson(output);
    });

  configCmd
    .command("validate")
    .description("Validate current config")
    .action(async () => {
      const core = await requireCoreConfig();
      const project = await loadProjectConfig().catch(() => null);
      printJson({
        core: { valid: true, gcloudProject: core.gcloud.projectId },
        project: project
          ? { valid: true, projectId: project.projectId }
          : {
              valid: false,
              reason: "Project config missing. Run `vesai init` in your repo.",
            },
      });
    });

  configCmd
    .command("set <path> <value>")
    .description(
      "Set config value using dot path prefixed with core. or project."
    )
    .addHelpText(
      "after",
      `
Examples:
  $ vesai config set core.runtime.maxRenderMemoryMb 8192
  $ vesai config set core.vertex.location us-central1
  $ vesai config set project.daemon.lookbackDays 180
  $ vesai config set project.posthog.groupKey organization
`
    )
    .action(async (path: string, value: string) => {
      const parsed = parseScalarValue(value);

      if (path.startsWith("core.")) {
        const keyPath = path.slice("core.".length);
        const next = await updateCoreConfig({
          updater: (config) => {
            const clone = structuredClone(config) as unknown as Record<
              string,
              unknown
            >;
            setNestedValue(clone, keyPath, parsed);
            return clone as never;
          },
        });
        printJson({ updated: true, scope: "core", updatedAt: next.updatedAt });
        return;
      }

      if (path.startsWith("project.")) {
        const keyPath = path.slice("project.".length);
        const next = await updateProjectConfig({
          updater: (config) => {
            const clone = structuredClone(config) as unknown as Record<
              string,
              unknown
            >;
            setNestedValue(clone, keyPath, parsed);
            return clone as never;
          },
        });
        printJson({
          updated: true,
          scope: "project",
          updatedAt: next.updatedAt,
        });
        return;
      }

      throw new Error("Config path must start with core. or project.");
    });
}
