#!/usr/bin/env node
import { Command } from "commander";
import { registerConfigCommand } from "./commands/config-command";
import { registerDaemonCommand } from "./commands/daemon-command";
import { registerDoctorCommand } from "./commands/doctor-command";
import { registerGroupCommand } from "./commands/group-command";
import { registerInitCommand } from "./commands/init-command";
import { registerQuickstartCommand } from "./commands/quickstart-command";
import { registerResearchCommand } from "./commands/research-command";
import { registerUserCommand } from "./commands/user-command";

const program = new Command();

program
  .name("vesai")
  .description("VES AI: session replay intelligence for agents")
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
  $ vesai init

Replay Story Workflows:
  $ vesai user bryce@lenny.com
  $ vesai group acme-inc
  $ vesai research "what causes checkout abandonment?"

Daemon Workflows:
  $ vesai daemon start
  $ vesai daemon status
  $ vesai daemon stop

Output mode:
  - JSON is default for data commands.
  - Use --no-json for human-readable summaries.
`
);

registerQuickstartCommand(program);
registerInitCommand(program);
registerUserCommand(program);
registerGroupCommand(program);
registerResearchCommand(program);
registerDaemonCommand(program);
registerConfigCommand(program);
registerDoctorCommand(program);

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
