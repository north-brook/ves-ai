import type { Command } from "commander";
import { getVesaiPaths, requireConfig, resolveVesaiHome } from "../../config";
import {
  getPlaywrightChromiumExecutablePath,
  isPlaywrightChromiumInstalled,
} from "../../connectors";
import { getDaemonStatus, printJson } from "./helpers";

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Check local setup")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai doctor
  $ vesai doctor | jq
`
    )
    .action(async () => {
      const home = resolveVesaiHome();
      const projectPaths = getVesaiPaths();
      const status = await getDaemonStatus();
      const config = await requireConfig();
      const playwrightExecutable = getPlaywrightChromiumExecutablePath();
      const playwrightInstalled =
        isPlaywrightChromiumInstalled(playwrightExecutable);

      printJson({
        coreHome: home,
        projectRoot: projectPaths.projectRoot,
        projectConfig: projectPaths.configFile,
        daemon: status,
        posthogProject: config.posthog.projectId,
        gcloudProject: config.gcloud.projectId,
        bucket: config.gcloud.bucket,
        playwright: {
          installed: playwrightInstalled,
          executable: playwrightExecutable,
        },
      });
    });
}
