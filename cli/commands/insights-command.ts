import { readFile as readFileFs } from "node:fs/promises";
import type { Command } from "commander";
import { requireConfig } from "../../config";
import {
  executeSqlQuery,
  generateHogQLFromQuestion,
  runInsightQuery,
} from "../../connectors";
import { printJson } from "./helpers";
import { normalizeHogqlInsight, normalizeSqlInsight } from "./insights-format";
import { mapRowToObject, printResult, shouldEmitJson } from "./runtime";

type InsightRunOptions = {
  queryJson?: string;
  queryFile?: string;
  hogql?: string;
  json?: boolean;
};

async function parseInsightQueryInput(
  options: InsightRunOptions
): Promise<Record<string, unknown>> {
  const candidates = [
    options.queryJson,
    options.queryFile,
    options.hogql,
  ].filter(Boolean);
  if (candidates.length !== 1) {
    throw new Error(
      "Provide exactly one of --query-json, --query-file, or --hogql."
    );
  }

  if (options.hogql) {
    return {
      kind: "DataVisualizationNode",
      source: {
        kind: "HogQLQuery",
        query: options.hogql,
      },
    };
  }

  if (options.queryFile) {
    const raw = await readFileFs(options.queryFile, "utf8");
    const parsed = JSON.parse(raw);
    if (!(parsed && typeof parsed === "object")) {
      throw new Error("--query-file must contain a JSON object.");
    }
    return parsed as Record<string, unknown>;
  }

  const parsed = JSON.parse(options.queryJson || "{}");
  if (!(parsed && typeof parsed === "object")) {
    throw new Error("--query-json must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export function registerInsightsCommand(program: Command): void {
  const insights = program
    .command("insights")
    .description("Run PostHog insight/HogQL analytics commands");

  insights.addHelpText(
    "after",
    `
Examples:
  $ vesai insights hogql "top events in the last 7 days"
  $ vesai insights sql "SELECT event, count() FROM events GROUP BY event LIMIT 20"
  $ vesai insights run --hogql "SELECT distinct_id, count() FROM events GROUP BY distinct_id LIMIT 10"

Output tips:
  - JSON output is default for structured agent workflows.
  - Use --no-json for human-readable previews.
  - Use --raw to inspect the original PostHog payload.
`
  );

  insights
    .command("run")
    .description("Run a PostHog insight query object")
    .option("--query-json <json>", "Insight query JSON object")
    .option("--query-file <path>", "Path to insight query JSON file")
    .option("--hogql <sql>", "Shortcut: run HogQL as a DataVisualizationNode")
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai insights run --hogql "SELECT event, count() FROM events GROUP BY event LIMIT 20"
  $ vesai insights run --query-file ./query.json
`
    )
    .action(async (options: InsightRunOptions) => {
      const config = await requireConfig();
      const query = await parseInsightQueryInput(options);
      const result = await runInsightQuery({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        query,
      });

      printResult(result, shouldEmitJson(options.json));
    });

  insights
    .command("hogql <question>")
    .description("Generate HogQL insight from a natural-language question")
    .option("--raw", "Return raw PostHog response payload")
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai insights hogql "weekly active users by plan"
  $ vesai insights hogql "show top pages for enterprise users last 30 days"
  $ vesai insights hogql "signup conversion by week" --raw
`
    )
    .action(
      async (question: string, options: { raw?: boolean; json?: boolean }) => {
        const config = await requireConfig();
        const raw = await generateHogQLFromQuestion({
          host: config.posthog.host,
          apiKey: config.posthog.apiKey,
          projectId: config.posthog.projectId,
          question,
        });

        if (options.raw) {
          printResult(raw, shouldEmitJson(options.json));
          return;
        }

        const normalized = normalizeHogqlInsight(raw);
        if (shouldEmitJson(options.json)) {
          printJson(normalized);
          return;
        }

        console.log(`HogQL question: ${question}`);
        if (normalized.query) {
          console.log("Generated query object:");
          printJson(normalized.query);
        }
        if (normalized.table) {
          const table = normalized.table;
          const preview = table.rows
            .slice(0, 10)
            .map((row) => mapRowToObject(table.columns, row));
          console.log(
            `Result rows: ${table.rows.length} (showing ${preview.length})`
          );
          printJson(preview);
        } else {
          console.log("No results table detected in response payload.");
        }
      }
    );

  insights
    .command("sql <query>")
    .description("Execute SQL/HogQL through PostHog MCP execute_sql")
    .option("--raw", "Return raw PostHog response payload")
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai insights sql "SELECT event, count() FROM events GROUP BY event LIMIT 20"
  $ vesai insights sql "SELECT person.properties.email, count() FROM events GROUP BY person.properties.email LIMIT 20"
  $ vesai insights sql "SELECT * FROM events LIMIT 5" --raw
`
    )
    .action(
      async (query: string, options: { raw?: boolean; json?: boolean }) => {
        const config = await requireConfig();
        const raw = await executeSqlQuery({
          host: config.posthog.host,
          apiKey: config.posthog.apiKey,
          projectId: config.posthog.projectId,
          query,
        });

        if (options.raw) {
          printResult(raw, shouldEmitJson(options.json));
          return;
        }

        const normalized = normalizeSqlInsight(raw);
        if (shouldEmitJson(options.json)) {
          printJson(normalized);
          return;
        }

        if (normalized.kind === "table") {
          const preview = normalized.rows
            .slice(0, 20)
            .map((row) => mapRowToObject(normalized.columns, row));
          console.log(
            `Rows: ${normalized.rowCount} (showing ${preview.length}) from insights sql`
          );
          printJson(preview);
          return;
        }

        printResult(raw, false);
      }
    );
}
