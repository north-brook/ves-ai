import type { Command } from "commander";
import { requireConfig } from "../../config";
import { listPropertyDefinitions } from "../../connectors";
import { printJson } from "./helpers";
import { shouldEmitJson } from "./runtime";

type PropertiesCommandOptions = {
  type: string;
  eventName?: string;
  includePredefined?: boolean;
  limit?: number;
  offset?: number;
  json?: boolean;
};

export function registerPropertiesCommand(program: Command): void {
  program
    .command("properties")
    .description("List PostHog property definitions (MCP-compatible)")
    .requiredOption("--type <type>", "Property type: event|person")
    .option("--event-name <name>", "Event name (required when --type event)")
    .option("--include-predefined", "Include predefined/system properties")
    .option("--limit <n>", "Limit number of properties", Number)
    .option("--offset <n>", "Pagination offset", Number)
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai properties --type person --limit 20
  $ vesai properties --type event --event-name '$pageview'
  $ vesai properties --type event --event-name '$autocapture' --include-predefined
`
    )
    .action(async (options: PropertiesCommandOptions) => {
      const type = options.type === "person" ? "person" : "event";
      if (type === "event" && !options.eventName) {
        throw new Error("--event-name is required when --type event.");
      }

      const config = await requireConfig();
      const properties = await listPropertyDefinitions({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        type,
        eventName: options.eventName,
        includePredefinedProperties: options.includePredefined,
        limit: options.limit,
        offset: options.offset,
      });

      if (shouldEmitJson(options.json)) {
        printJson(properties);
        return;
      }

      console.log(`Properties (${type}): ${properties.length}`);
      printJson(properties);
    });
}
