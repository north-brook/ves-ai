import type { Command } from "commander";
import { ensurePlaywrightChromiumInstalled } from "../../connectors";
import { analyzeUserByEmail } from "../analysis";
import { printJson } from "./helpers";
import { createReplayProgressRenderer } from "./replays-progress";
import {
  ensureReplayContext,
  type ReplayRunOptions,
  resolveSessionConcurrency,
  shouldEmitJson,
  withRenderLogMode,
} from "./runtime";

export function registerUserCommand(program: Command): void {
  program
    .command("user <email>")
    .description("Analyze one user story from all matching replay sessions")
    .option(
      "--max-concurrent <n>",
      "Max concurrent session pipelines for this run",
      Number
    )
    .option("--verbose", "Show low-level render/debug logs")
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
What this does:
  - Finds all sessions for the user.
  - Analyzes each session replay.
  - Returns one aggregate user story.
`
    )
    .action(async (email: string, options: ReplayRunOptions) => {
      const { config } = await ensureReplayContext();
      await ensurePlaywrightChromiumInstalled();

      const progress = shouldEmitJson(options.json)
        ? null
        : createReplayProgressRenderer({
            label: `user ${email}`,
          });

      try {
        const result = await withRenderLogMode(options.verbose, async () =>
          analyzeUserByEmail({
            email,
            context: { config },
            sessionConcurrency: resolveSessionConcurrency(options, config),
            onSessionProgress: progress?.handle,
          })
        );

        const output = {
          email: result.email,
          sessionCount: result.sessionCount,
          averageSessionScore: result.averageSessionScore,
          userScore: result.userScore,
          health: result.health,
          story: result.story,
          markdownPath: result.markdownPath,
        };

        if (shouldEmitJson(options.json)) {
          printJson(output);
          return;
        }

        console.log(`User: ${output.email}`);
        console.log(`Sessions: ${output.sessionCount}`);
        console.log(`Average session score: ${output.averageSessionScore}`);
        console.log(`User score: ${output.userScore}`);
        console.log(`Health: ${output.health}`);
        console.log(`Markdown: ${output.markdownPath}`);
        console.log("");
        console.log(output.story);
      } finally {
        progress?.close();
      }
    });
}
