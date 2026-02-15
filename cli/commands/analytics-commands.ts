import type { Command } from "commander";
import { registerErrorsCommand } from "./errors-command";
import { registerEventsCommand } from "./events-command";
import { registerInsightsCommand } from "./insights-command";
import { registerLogsCommand } from "./logs-command";
import { registerPropertiesCommand } from "./properties-command";
import { registerSchemaCommand } from "./schema-command";

export function registerAnalyticsCommands(program: Command): void {
  registerEventsCommand(program);
  registerPropertiesCommand(program);
  registerSchemaCommand(program);
  registerInsightsCommand(program);
  registerErrorsCommand(program);
  registerLogsCommand(program);
}
