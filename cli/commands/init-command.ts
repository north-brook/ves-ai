import type { Command } from "commander";
import { ensureCoreDirectories } from "../../config";
import { type InitCommandOptions, runInitCli } from "./init";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize current directory as a VES AI project")
    .option("--project-id <uuid>", "VES AI project id UUID override")
    .option("--posthog-host <url>", "PostHog host URL")
    .option("--posthog-api-key <key>", "PostHog user API key")
    .option("--posthog-project-id <id>", "PostHog project id")
    .option("--posthog-group-key <key>", "PostHog group key")
    .option("--domain-filter <domain>", "Replay domain filter")
    .option(
      "--lookback-days <n>",
      "Initial backfill lookback window in days (positive integer)",
      Number
    )
    .option(
      "--product-description <text>",
      "Product description for analysis context"
    )
    .option("-y, --yes", "Use defaults where possible without prompting")
    .option(
      "--non-interactive",
      "Disable prompts and require flags for required fields"
    )
    .addHelpText(
      "after",
      `
Creates .vesai/ in the current repository, writes project config, and ensures
.vesai/ is added to .gitignore.

Examples:
  $ vesai init
  $ vesai init --yes --domain-filter app.example.com --product-description "B2B SaaS for support teams"
  $ vesai init --non-interactive --posthog-api-key phx_... --posthog-project-id 123 --posthog-group-key organization --domain-filter app.example.com --product-description "B2B SaaS for support teams"
`
    )
    .action(async (options: InitCommandOptions) => {
      await ensureCoreDirectories();
      await runInitCli(options);
    });
}
