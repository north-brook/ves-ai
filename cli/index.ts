#!/usr/bin/env node
import { Command } from "commander";
import { registerAnalyticsCommands } from "./commands/analytics-commands";
import { registerConfigCommand } from "./commands/config-command";
import { registerDaemonCommand } from "./commands/daemon-command";
import { registerDoctorCommand } from "./commands/doctor-command";
import { registerQuickstartCommand } from "./commands/quickstart-command";
import { registerReplaysCommand } from "./commands/replays-command";

const program = new Command();

program
  .name("vesai")
  .description("VES AI: AI-ready product analytics")
  .version("0.1.0");
program.showSuggestionAfterError(true);
program.showHelpAfterError(
  "\nRun with --help to see command usage and examples."
);
program.addHelpText(
  "after",
  `
Quickstart:
  $ vesai quickstart

Replay Workflows:
  $ vesai replays user bryce@lenny.com
  $ vesai replays session ph_abc123
  $ vesai replays query "checkout friction" --from 2026-01-01 --to 2026-01-31

Analytics Workflows:
  $ vesai events --search checkout
  $ vesai insights hogql "weekly active users by plan"
  $ vesai insights sql "SELECT event, count() FROM events GROUP BY event LIMIT 20"

Agent Workflows:
  $ vesai replays query --group acme --min-active 30 --dry-run
  $ vesai replays query --group acme --min-active 30
  $ vesai insights sql "SELECT event, count() FROM events GROUP BY event LIMIT 20"
  $ vesai config show --show-secrets

Output mode:
  - JSON is default for data commands.
  - Use --no-json for human-readable summaries.
`
);

registerQuickstartCommand(program);
registerReplaysCommand(program);
registerAnalyticsCommands(program);
registerDaemonCommand(program);
registerConfigCommand(program);
registerDoctorCommand(program);

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
