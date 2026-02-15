import type { Command } from "commander";
import { requireConfig } from "../../config";
import {
  listEventDefinitions,
  readDataSchema,
  readDataWarehouseSchema,
} from "../../connectors";
import { printResult, shouldEmitJson } from "./runtime";

type SchemaDataCommandOptions = {
  kind?: string;
  eventName?: string;
  entity?: string;
  propertyName?: string;
  actionId?: string;
  search?: string;
  limit?: number;
  json?: boolean;
};

type SchemaWarehouseOptions = {
  json?: boolean;
};

function buildTaxonomyQuery(
  options: SchemaDataCommandOptions
): Record<string, unknown> {
  const rawKind = (options.kind || "events").trim().toLowerCase();
  if (rawKind === "events") {
    return { kind: "events" };
  }
  if (rawKind === "event-properties" || rawKind === "event_properties") {
    if (!options.eventName) {
      throw new Error("--event-name is required when --kind event-properties.");
    }
    return {
      kind: "event_properties",
      event_name: options.eventName,
    };
  }
  if (rawKind === "entity-properties" || rawKind === "entity_properties") {
    if (!options.entity) {
      throw new Error("--entity is required when --kind entity-properties.");
    }
    return {
      kind: "entity_properties",
      entity: options.entity,
    };
  }
  if (rawKind === "action-properties" || rawKind === "action_properties") {
    const actionId = Number(options.actionId);
    if (!(Number.isInteger(actionId) && actionId > 0)) {
      throw new Error(
        "--action-id must be a positive integer when --kind action-properties."
      );
    }
    return {
      kind: "action_properties",
      action_id: actionId,
    };
  }
  if (
    rawKind === "entity-property-values" ||
    rawKind === "entity_property_values"
  ) {
    if (!(options.entity && options.propertyName)) {
      throw new Error(
        "--entity and --property-name are required when --kind entity-property-values."
      );
    }
    return {
      kind: "entity_property_values",
      entity: options.entity,
      property_name: options.propertyName,
    };
  }
  if (
    rawKind === "event-property-values" ||
    rawKind === "event_property_values"
  ) {
    if (!(options.eventName && options.propertyName)) {
      throw new Error(
        "--event-name and --property-name are required when --kind event-property-values."
      );
    }
    return {
      kind: "event_property_values",
      event_name: options.eventName,
      property_name: options.propertyName,
    };
  }
  if (
    rawKind === "action-property-values" ||
    rawKind === "action_property_values"
  ) {
    const actionId = Number(options.actionId);
    if (!(Number.isInteger(actionId) && actionId > 0 && options.propertyName)) {
      throw new Error(
        "--action-id (positive integer) and --property-name are required when --kind action-property-values."
      );
    }
    return {
      kind: "action_property_values",
      action_id: actionId,
      property_name: options.propertyName,
    };
  }
  throw new Error(
    `Invalid --kind '${options.kind}'. See \`vesai schema data --help\`.`
  );
}

export function registerSchemaCommand(program: Command): void {
  const schema = program
    .command("schema")
    .description("Inspect PostHog data schemas via MCP-backed APIs");

  schema
    .command("data [query]")
    .description("Read PostHog event/property taxonomy")
    .option(
      "--kind <kind>",
      "events|event-properties|entity-properties|action-properties|entity-property-values|event-property-values|action-property-values"
    )
    .option("--event-name <name>", "Event name for event-* kinds")
    .option("--entity <name>", "Entity name for entity-* kinds")
    .option(
      "--property-name <name>",
      "Property name for *-property-values kinds"
    )
    .option("--action-id <id>", "Action id for action-* kinds")
    .option("--search <text>", "Shortcut: search event definitions by text")
    .option(
      "--limit <n>",
      "Search limit (used with positional query or --search)",
      Number
    )
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai schema data --kind events
  $ vesai schema data --kind event-properties --event-name "$pageview"
  $ vesai schema data --kind event-property-values --event-name "$pageview" --property-name "$browser"
  $ vesai schema data checkout --limit 20
`
    )
    .action(
      async (query: string | undefined, options: SchemaDataCommandOptions) => {
        const config = await requireConfig();
        const searchText = options.search?.trim() || query?.trim();
        if (searchText) {
          const events = await listEventDefinitions({
            host: config.posthog.host,
            apiKey: config.posthog.apiKey,
            projectId: config.posthog.projectId,
            search: searchText,
            limit: options.limit ?? 25,
            offset: 0,
          });

          const result = {
            mode: "event_search",
            search: searchText,
            count: events.length,
            events,
          };
          printResult(result, shouldEmitJson(options.json));
          return;
        }

        const taxonomyQuery = buildTaxonomyQuery(options);
        const result = await readDataSchema({
          host: config.posthog.host,
          apiKey: config.posthog.apiKey,
          projectId: config.posthog.projectId,
          query: taxonomyQuery,
        });

        printResult(result, shouldEmitJson(options.json));
      }
    );

  schema
    .command("warehouse")
    .description("Read PostHog warehouse/session/person schema information")
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai schema warehouse
  $ vesai schema warehouse --no-json
`
    )
    .action(async (options: SchemaWarehouseOptions) => {
      const config = await requireConfig();
      const result = await readDataWarehouseSchema({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
      });

      printResult(result, shouldEmitJson(options.json));
    });
}
