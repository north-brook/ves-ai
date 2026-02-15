import type { Command } from "commander";
import { loadConfig, requireConfig, updateConfig } from "../../config";
import { printJson, redactConfigSecrets } from "./helpers";

type ConfigShowOptions = {
  showSecrets?: boolean;
};

export function registerConfigCommand(program: Command): void {
  const configCmd = program.command("config").description("Config commands");

  configCmd.addHelpText(
    "after",
    `
Examples:
  $ vesai config show
  $ vesai config show --show-secrets
  $ vesai config validate
  $ vesai config set runtime.maxConcurrentRenders 6
`
  );

  configCmd
    .command("show")
    .description("Show current config")
    .option(
      "--show-secrets",
      "Show sensitive values (default redacts credentials)"
    )
    .addHelpText(
      "after",
      `
By default, sensitive keys are redacted.
Use --show-secrets only in trusted local terminals.
`
    )
    .action(async (options: ConfigShowOptions) => {
      const config = await loadConfig();
      printJson(options.showSecrets ? config : redactConfigSecrets(config));
    });

  configCmd
    .command("validate")
    .description("Validate current config")
    .addHelpText(
      "after",
      `
Use this after quickstart or manual config edits.
`
    )
    .action(async () => {
      const config = await requireConfig();
      printJson({ valid: true, project: config.gcloud.projectId });
    });

  configCmd
    .command("set <path> <value>")
    .description("Set a config value using dot path")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai config set posthog.groupKey organization
  $ vesai config set runtime.maxConcurrentRenders 6
  $ vesai config set vertex.location us-central1
`
    )
    .action(async (path: string, value: string) => {
      const next = await updateConfig({
        updater: (config) => {
          const clone = structuredClone(config);
          const keys = path.split(".").filter(Boolean);
          if (!keys.length) {
            throw new Error("Invalid config path");
          }

          let current: Record<string, unknown> = clone as unknown as Record<
            string,
            unknown
          >;

          for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i]!;
            const existing = current[key];
            if (!existing || typeof existing !== "object") {
              current[key] = {};
            }
            current = current[key] as Record<string, unknown>;
          }

          const finalKey = keys[keys.length - 1]!;
          let parsed: unknown = value;
          if (value === "true") {
            parsed = true;
          } else if (value === "false") {
            parsed = false;
          } else if (!Number.isNaN(Number(value))) {
            parsed = Number(value);
          }

          current[finalKey] = parsed;
          return clone;
        },
      });

      printJson({ updated: true, updatedAt: next.updatedAt });
    });
}
