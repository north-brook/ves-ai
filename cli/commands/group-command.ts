import type { Command } from "commander";
import { ensurePlaywrightChromiumInstalled } from "../../connectors";
import { analyzeGroupById } from "../analysis";
import { printJson } from "./helpers";
import { createReplayProgressRenderer } from "./replays-progress";
import {
  ensureReplayContext,
  type ReplayRunOptions,
  resolveSessionConcurrency,
  shouldEmitJson,
  withRenderLogMode,
} from "./runtime";

export function registerGroupCommand(program: Command): void {
  program
    .command("group <groupId>")
    .description(
      "Analyze one group story from all users and sessions under this group id"
    )
    .option(
      "--max-concurrent <n>",
      "Max concurrent session pipelines for each user",
      Number
    )
    .option("--verbose", "Show low-level render/debug logs")
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
What this does:
  - Resolves users associated with the group id.
  - Builds each user story from that user's sessions.
  - Returns one aggregate group story.
`
    )
    .action(async (groupId: string, options: ReplayRunOptions) => {
      const { config } = await ensureReplayContext();
      await ensurePlaywrightChromiumInstalled();

      const progress = shouldEmitJson(options.json)
        ? null
        : createReplayProgressRenderer({
            label: `group ${groupId}`,
          });

      try {
        const result = await withRenderLogMode(options.verbose, async () =>
          analyzeGroupById({
            groupId,
            context: { config },
            sessionConcurrency: resolveSessionConcurrency(options, config),
            onSessionProgress: progress?.handle,
          })
        );

        if (shouldEmitJson(options.json)) {
          printJson(result);
          return;
        }

        console.log(`Group: ${result.groupId}`);
        console.log(`Users analyzed: ${result.usersAnalyzed}`);
        console.log(`Score: ${result.score}`);
        console.log(`Health: ${result.health}`);
        console.log(`Markdown: ${result.markdownPath}`);
        console.log("");
        console.log(result.story);
      } finally {
        progress?.close();
      }
    });
}
