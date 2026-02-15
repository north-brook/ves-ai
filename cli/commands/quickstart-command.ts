import type { Command } from "commander";
import { ensureCoreDirectories } from "../../config";
import { type QuickstartCommandOptions, runQuickstartCli } from "./quickstart";

export function registerQuickstartCommand(program: Command): void {
  program
    .command("quickstart")
    .description("Run global machine setup (core config + render service)")
    .option("--gcloud-project-id <id>", "Google Cloud project id override")
    .option("--vertex-location <location>", "Vertex AI location")
    .option("--bucket-location <location>", "GCS bucket location")
    .option("--bucket <name>", "GCS bucket name")
    .option(
      "--max-render-memory-mb <n>",
      "Max memory budget for render services in MiB",
      Number
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
  - PostHog setup is now project-scoped via \`vesai init\`.
  - Run \`vesai init\` in each repository after global quickstart.

Examples:
  $ vesai quickstart
  $ vesai quickstart --yes --gcloud-project-id my-gcp-project --bucket vesai-my-gcp-project --max-render-memory-mb 8192
  $ vesai quickstart --non-interactive --gcloud-project-id my-gcp-project --bucket vesai-my-gcp-project --vertex-location us-central1
`
    )
    .action(async (options: QuickstartCommandOptions) => {
      await ensureCoreDirectories();
      await runQuickstartCli(options);
    });
}
