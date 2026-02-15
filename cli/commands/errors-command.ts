import type { Command } from "commander";
import { requireConfig } from "../../config";
import { getErrorDetails, listErrors } from "../../connectors";
import { printResult, shouldEmitJson } from "./runtime";

type ErrorListOptions = {
  orderBy?: "occurrences" | "first_seen" | "last_seen" | "users" | "sessions";
  orderDirection?: "ASC" | "DESC";
  status?: "active" | "resolved" | "all" | "suppressed";
  from?: string;
  to?: string;
  includeTestAccounts?: boolean;
  json?: boolean;
};

type ErrorDetailsOptions = {
  from?: string;
  to?: string;
  json?: boolean;
};

export function registerErrorsCommand(program: Command): void {
  const errors = program
    .command("errors")
    .description("Query PostHog error-tracking data");

  errors.addHelpText(
    "after",
    `
Examples:
  $ vesai errors list --status active --from 2026-02-01T00:00:00Z --to 2026-02-15T00:00:00Z
  $ vesai errors list --order-by occurrences --order-direction DESC
  $ vesai errors details <issueId>
`
  );

  errors
    .command("list")
    .description("List top errors")
    .option(
      "--order-by <field>",
      "occurrences|first_seen|last_seen|users|sessions"
    )
    .option("--order-direction <dir>", "ASC|DESC")
    .option("--status <status>", "active|resolved|all|suppressed")
    .option("--from <isoDate>", "Start date (ISO timestamp)")
    .option("--to <isoDate>", "End date (ISO timestamp)")
    .option("--include-test-accounts", "Include test-account traffic")
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai errors list --status active
  $ vesai errors list --order-by occurrences --order-direction DESC
  $ vesai errors list --from 2026-02-01T00:00:00Z --to 2026-02-15T00:00:00Z
`
    )
    .action(async (options: ErrorListOptions) => {
      const config = await requireConfig();
      const result = await listErrors({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        input: {
          orderBy: options.orderBy,
          orderDirection: options.orderDirection,
          status: options.status,
          dateFrom: options.from,
          dateTo: options.to,
          filterTestAccounts: options.includeTestAccounts,
        },
      });

      printResult(result, shouldEmitJson(options.json));
    });

  errors
    .command("details <issueId>")
    .description("Get detailed data for one error issue UUID")
    .option("--from <isoDate>", "Start date (ISO timestamp)")
    .option("--to <isoDate>", "End date (ISO timestamp)")
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai errors details 0195f3f9-d39b-7210-ac23-c3be31b1c6ba
  $ vesai errors details <issueId> --from 2026-02-01T00:00:00Z --to 2026-02-15T00:00:00Z
`
    )
    .action(async (issueId: string, options: ErrorDetailsOptions) => {
      const config = await requireConfig();
      const result = await getErrorDetails({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        issueId,
        dateFrom: options.from,
        dateTo: options.to,
      });

      printResult(result, shouldEmitJson(options.json));
    });
}
