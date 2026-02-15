import { spawn } from "node:child_process";
import { open } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { kill } from "node:process";
import { fileURLToPath } from "node:url";
import type { Command } from "commander";
import {
  ensureCoreDirectories,
  ensureProjectDirectories,
  getVesaiPaths,
  requireConfig,
} from "../../config";
import { ensurePlaywrightChromiumInstalled } from "../../connectors";
import { startDaemon } from "../../daemon/runner";
import { getDaemonStatus, printJson } from "./helpers";

const DAEMON_START_TIMEOUT_MS = 5000;
const DAEMON_START_POLL_MS = 100;
const CLI_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(CLI_DIR, "../..");
const DAEMON_ENTRYPOINT = resolve(REPO_ROOT, "daemon/index.ts");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForDaemonToBeRunning(
  timeoutMs = DAEMON_START_TIMEOUT_MS
): Promise<{ running: boolean; pid?: number }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await getDaemonStatus();
    if (status.running && status.pid) {
      return status;
    }
    await sleep(DAEMON_START_POLL_MS);
  }
  return getDaemonStatus();
}

async function startDaemonInBackground(): Promise<{
  pid: number;
  logFile: string;
}> {
  const paths = getVesaiPaths();
  const logFile = `${paths.logsDir}/daemon.log`;
  const logHandle = await open(logFile, "a");

  try {
    const child = spawn(process.execPath, [DAEMON_ENTRYPOINT], {
      cwd: REPO_ROOT,
      detached: true,
      env: {
        ...process.env,
        VESAI_PROJECT_ROOT: paths.projectRoot,
      },
      stdio: ["ignore", logHandle.fd, logHandle.fd],
    });
    child.unref();
  } finally {
    await logHandle.close();
  }

  const status = await waitForDaemonToBeRunning();
  if (!(status.running && status.pid)) {
    throw new Error(`Daemon failed to start. Check logs at ${logFile}`);
  }

  return { pid: status.pid, logFile };
}

export function registerDaemonCommand(program: Command): void {
  const daemon = program.command("daemon").description("Daemon lifecycle");

  daemon.addHelpText(
    "after",
    `
Examples:
  $ vesai daemon start
  $ vesai daemon watch
  $ vesai daemon status
  $ vesai daemon stop

Behavior:
  - First run backfills replay analysis from init lookbackDays.
  - Ongoing heartbeat pulls sessions from last cursor to now and queues analysis.
`
  );

  daemon
    .command("start")
    .description("Start the local daemon in the background")
    .addHelpText(
      "after",
      `
Runs daemon detached from the terminal and writes logs under .vesai/logs.
Use \`vesai daemon status\` to confirm pid and \`vesai daemon stop\` to shut down.
`
    )
    .action(async () => {
      await ensureCoreDirectories();
      await ensureProjectDirectories();
      await requireConfig();
      await ensurePlaywrightChromiumInstalled();

      const status = await getDaemonStatus();
      if (status.running && status.pid) {
        console.log(`Daemon is already running (pid ${status.pid}).`);
        return;
      }

      const started = await startDaemonInBackground();
      console.log(`Daemon started in background (pid ${started.pid}).`);
      console.log(`Logs: ${started.logFile}`);
      console.log("Use `vesai daemon watch` for foreground mode.");
    });

  daemon
    .command("watch")
    .description("Run the daemon in foreground (Ctrl+C to stop)")
    .addHelpText(
      "after",
      `
Runs daemon attached to your terminal for local development.
Process exits on Ctrl+C or shell exit.
`
    )
    .action(async () => {
      await ensureCoreDirectories();
      await ensureProjectDirectories();
      await requireConfig();
      await ensurePlaywrightChromiumInstalled();

      console.log("Starting daemon in foreground. Press Ctrl+C to stop.");
      await startDaemon();
    });

  daemon
    .command("status")
    .description("Show daemon status")
    .addHelpText(
      "after",
      `
Returns JSON with running state and pid when active.
`
    )
    .action(async () => {
      const status = await getDaemonStatus();
      printJson(status);
    });

  daemon
    .command("stop")
    .description("Stop daemon")
    .addHelpText(
      "after",
      `
Stops the background daemon process if it is running.
`
    )
    .action(async () => {
      const paths = getVesaiPaths();
      const status = await getDaemonStatus();

      if (!(status.running && status.pid)) {
        console.log("Daemon is not running.");
        return;
      }

      kill(status.pid, "SIGTERM");
      console.log(`Stopped daemon pid ${status.pid}`);
      console.log(`PID file: ${paths.daemonPidFile}`);
    });
}
