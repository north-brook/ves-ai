import type { Command } from "commander";
import { researchFromAnalyzedSessions } from "../analysis";
import { printJson } from "./helpers";
import { ensureReplayContext, shouldEmitJson } from "./runtime";

type ResearchCommandOptions = {
  limit?: number;
  json?: boolean;
};

export function registerResearchCommand(program: Command): void {
  program
    .command("research <question>")
    .description(
      "Answer a product research question using already analyzed replay sessions"
    )
    .option(
      "--limit <n>",
      "Max analyzed sessions to include in context",
      Number
    )
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Important:
  - Uses only already analyzed sessions from workspace.
  - Does not fetch or analyze new sessions.
`
    )
    .action(async (question: string, options: ResearchCommandOptions) => {
      const { config } = await ensureReplayContext();
      const result = await researchFromAnalyzedSessions({
        question,
        context: { config },
        limit: options.limit,
      });

      if (shouldEmitJson(options.json)) {
        printJson(result);
        return;
      }

      console.log(`Question: ${result.question}`);
      console.log(`Confidence: ${result.confidence}`);
      console.log(
        `Sessions: used ${result.sessionsUsed} of ${result.sessionsConsidered} analyzed sessions`
      );
      if (result.supportingSessionIds.length) {
        console.log(
          `Supporting sessions: ${result.supportingSessionIds.join(", ")}`
        );
      }
      if (result.findings.length) {
        console.log("");
        console.log("Findings:");
        for (const finding of result.findings) {
          console.log(`- ${finding}`);
        }
      }
      console.log("");
      console.log(result.answer);
    });
}
