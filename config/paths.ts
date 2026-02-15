import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export type VesaiCorePaths = {
  home: string;
  coreConfigFile: string;
  logsDir: string;
  tmpDir: string;
  appDir: string;
  renderLocksDir: string;
};

export type VesaiPaths = {
  projectRoot: string;
  vesaiDir: string;
  configFile: string;
  workspace: string;
  sessionsDir: string;
  usersDir: string;
  groupsDir: string;
  researchDir: string;
  jobsDir: string;
  cacheDir: string;
  logsDir: string;
  tmpDir: string;
  daemonPidFile: string;
  daemonStateFile: string;
};

export function resolveVesaiHome(): string {
  const customHome = process.env.VESAI_HOME?.trim();
  if (customHome) {
    return customHome;
  }
  return join(homedir(), ".vesai");
}

export function getVesaiCorePaths(
  homeDir = resolveVesaiHome()
): VesaiCorePaths {
  return {
    home: homeDir,
    coreConfigFile: join(homeDir, "core.json"),
    logsDir: join(homeDir, "logs"),
    tmpDir: join(homeDir, "tmp"),
    appDir: join(homeDir, "app", "vesai"),
    renderLocksDir: join(homeDir, "render-locks"),
  };
}

function hasProjectConfig(projectRoot: string): boolean {
  return existsSync(join(projectRoot, ".vesai", "project.json"));
}

export function findProjectRoot(startDir = process.cwd()): string | null {
  let current = resolve(startDir);
  while (true) {
    if (hasProjectConfig(current)) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export function resolveProjectRoot(startDir = process.cwd()): string {
  const override = process.env.VESAI_PROJECT_ROOT?.trim();
  if (override) {
    return resolve(override);
  }

  const found = findProjectRoot(startDir);
  if (found) {
    return found;
  }

  throw new Error(
    `No VES AI project found from ${resolve(startDir)}. Run \`vesai init\` in your project root first.`
  );
}

export function getVesaiPaths(projectRoot = resolveProjectRoot()): VesaiPaths {
  const root = resolve(projectRoot);
  const vesaiDir = join(root, ".vesai");
  const workspace = join(vesaiDir, "workspace");

  return {
    projectRoot: root,
    vesaiDir,
    configFile: join(vesaiDir, "project.json"),
    workspace,
    sessionsDir: join(workspace, "sessions"),
    usersDir: join(workspace, "users"),
    groupsDir: join(workspace, "groups"),
    researchDir: join(workspace, "research"),
    jobsDir: join(vesaiDir, "jobs"),
    cacheDir: join(vesaiDir, "cache"),
    logsDir: join(vesaiDir, "logs"),
    tmpDir: join(vesaiDir, "tmp"),
    daemonPidFile: join(vesaiDir, "daemon.pid"),
    daemonStateFile: join(vesaiDir, "daemon-state.json"),
  };
}
