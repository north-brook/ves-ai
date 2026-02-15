import type { Command } from "commander";
import { requireConfig } from "../../config";
import {
  listLogAttributes,
  listLogAttributeValues,
  queryLogs,
} from "../../connectors";
import { collectOption } from "./query-filters";
import { printResult, shouldEmitJson } from "./runtime";

type LogsQueryOptions = {
  from: string;
  to: string;
  severity: string[];
  service: string[];
  search?: string;
  order?: "latest" | "earliest";
  limit?: number;
  after?: string;
  json?: boolean;
};

type LogsAttributesOptions = {
  type?: "log" | "resource";
  search?: string;
  limit?: number;
  offset?: number;
  json?: boolean;
};

type LogsValuesOptions = {
  type?: "log" | "resource";
  search?: string;
  limit?: number;
  json?: boolean;
};

export function registerLogsCommand(program: Command): void {
  const logs = program
    .command("logs")
    .description("Query PostHog logs and log metadata");

  logs.addHelpText(
    "after",
    `
Examples:
  $ vesai logs query --from 2026-02-15T00:00:00Z --to 2026-02-15T06:00:00Z --severity error
  $ vesai logs attributes --type resource
  $ vesai logs values service.name --limit 20
`
  );

  logs
    .command("query")
    .description("Run a logs query")
    .requiredOption("--from <isoDate>", "Start date (ISO timestamp)")
    .requiredOption("--to <isoDate>", "End date (ISO timestamp)")
    .option(
      "--severity <level>",
      "Repeatable: trace|debug|info|warn|error|fatal",
      collectOption,
      []
    )
    .option(
      "--service <name>",
      "Repeatable service-name filter",
      collectOption,
      []
    )
    .option("--search <term>", "Free-text search")
    .option("--order <order>", "latest|earliest")
    .option("--limit <n>", "Max rows", Number)
    .option("--after <cursor>", "Pagination cursor")
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai logs query --from 2026-02-15T00:00:00Z --to 2026-02-15T06:00:00Z --severity error
  $ vesai logs query --from 2026-02-15T00:00:00Z --to 2026-02-15T06:00:00Z --service api --search timeout

Tip:
  - Start with \`vesai logs attributes\` and \`vesai logs values <key>\` to discover filterable fields.
`
    )
    .action(async (options: LogsQueryOptions) => {
      const config = await requireConfig();
      const result = await queryLogs({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        input: {
          dateFrom: options.from,
          dateTo: options.to,
          severityLevels: options.severity as Array<
            "trace" | "debug" | "info" | "warn" | "error" | "fatal"
          >,
          serviceNames: options.service,
          searchTerm: options.search,
          orderBy: options.order,
          limit: options.limit,
          after: options.after,
        },
      });

      printResult(result, shouldEmitJson(options.json));
    });

  logs
    .command("attributes")
    .description("List available log/resource attributes")
    .option("--type <type>", "log|resource")
    .option("--search <text>", "Filter by name")
    .option("--limit <n>", "Max rows", Number)
    .option("--offset <n>", "Pagination offset", Number)
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai logs attributes
  $ vesai logs attributes --type resource --search service
  $ vesai logs attributes --type log
`
    )
    .action(async (options: LogsAttributesOptions) => {
      const config = await requireConfig();
      const result = await listLogAttributes({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        attributeType: options.type,
        search: options.search,
        limit: options.limit,
        offset: options.offset,
      });

      printResult(result, shouldEmitJson(options.json));
    });

  logs
    .command("values <key>")
    .description("List values for a log/resource attribute key")
    .option("--type <type>", "log|resource")
    .option("--search <text>", "Filter values")
    .option("--limit <n>", "Max rows", Number)
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai logs values service.name
  $ vesai logs values service.name --search api --limit 20
  $ vesai logs values resource.cloud.region
`
    )
    .action(async (key: string, options: LogsValuesOptions) => {
      const config = await requireConfig();
      const values = await listLogAttributeValues({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        key,
        attributeType: options.type,
        search: options.search,
      });

      const result =
        options.limit && Number.isFinite(options.limit)
          ? values.slice(0, Math.max(1, options.limit))
          : values;

      printResult(result, shouldEmitJson(options.json));
    });
}
