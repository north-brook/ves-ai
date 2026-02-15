import { homedir } from "node:os";
import { join } from "node:path";

export type VesaiPaths = {
  home: string;
  configFile: string;
  workspace: string;
  sessionsDir: string;
  usersDir: string;
  groupsDir: string;
  jobsDir: string;
  cacheDir: string;
  logsDir: string;
  tmpDir: string;
  appDir: string;
  daemonPidFile: string;
};

export function resolveVesaiHome(): string {
  const customHome = process.env.VESAI_HOME?.trim();
  if (customHome) {
    return customHome;
  }
  return join(homedir(), ".vesai");
}

export function getVesaiPaths(homeDir = resolveVesaiHome()): VesaiPaths {
  const workspace = join(homeDir, "workspace");
  return {
    home: homeDir,
    configFile: join(homeDir, "vesai.json"),
    workspace,
    sessionsDir: join(workspace, "sessions"),
    usersDir: join(workspace, "users"),
    groupsDir: join(workspace, "groups"),
    jobsDir: join(homeDir, "jobs"),
    cacheDir: join(homeDir, "cache"),
    logsDir: join(homeDir, "logs"),
    tmpDir: join(homeDir, "tmp"),
    appDir: join(homeDir, "app", "vesai"),
    daemonPidFile: join(homeDir, "daemon.pid"),
  };
}
