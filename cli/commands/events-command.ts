import type { Command } from "commander";
import { requireConfig } from "../../config";
import { listEventDefinitions } from "../../connectors";
import { printJson } from "./helpers";
import { shouldEmitJson } from "./runtime";

type EventsCommandOptions = {
  search?: string;
  limit?: number;
  offset?: number;
  json?: boolean;
};

export function registerEventsCommand(program: Command): void {
  program
    .command("events")
    .description("List PostHog event definitions (MCP-compatible)")
    .option("--search <text>", "Search by event name")
    .option("--limit <n>", "Limit number of events", Number)
    .option("--offset <n>", "Pagination offset", Number)
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai events
  $ vesai events --search checkout --limit 20
  $ vesai events --search "$pageview"
`
    )
    .action(async (options: EventsCommandOptions) => {
      const config = await requireConfig();
      const events = await listEventDefinitions({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        search: options.search,
        limit: options.limit,
        offset: options.offset,
      });

      if (shouldEmitJson(options.json)) {
        printJson(events);
        return;
      }

      console.log(`Events: ${events.length}`);
      printJson(events);
    });
}
