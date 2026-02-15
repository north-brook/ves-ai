import type { Command } from "commander";
import { ensureVesaiDirectories } from "../../config";
import { type QuickstartCommandOptions, runQuickstartCli } from "./quickstart";

export function registerQuickstartCommand(program: Command): void {
  program
    .command("quickstart")
    .description("Run CLI setup wizard")
    .option("--posthog-host <url>", "PostHog host URL")
    .option("--posthog-api-key <key>", "PostHog user API key")
    .option("--posthog-project-id <id>", "PostHog project id")
    .option("--posthog-group-key <key>", "PostHog group key")
    .option("--domain-filter <domain>", "Replay domain filter")
    .option("--gcloud-project-id <id>", "Google Cloud project id override")
    .option("--vertex-location <location>", "Vertex AI location")
    .option("--bucket-location <location>", "GCS bucket location")
    .option("--bucket <name>", "GCS bucket name")
    .option(
      "--max-concurrent-renders <n>",
      "Max concurrent renders (positive integer)",
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
Requirements before quickstart:
  - gcloud auth login
  - gcloud auth application-default login
  - gcloud config set project <project-id>

PostHog key guidance:
  - Create User API key: https://app.posthog.com/settings/user-api-keys
  - Required scope: All access + MCP server scope

Examples:
  $ vesai quickstart
  $ vesai quickstart --yes --posthog-api-key phx_... --posthog-project-id 123 --domain-filter app.example.com --max-concurrent-renders 8 --product-description "B2B SaaS for..."
  $ vesai quickstart --non-interactive --posthog-api-key phx_... --posthog-project-id 123 --posthog-group-key company_id --domain-filter app.example.com --product-description "B2B SaaS for..."
`
    )
    .action(async (options: QuickstartCommandOptions) => {
      await ensureVesaiDirectories();
      await runQuickstartCli(options);
    });
}
