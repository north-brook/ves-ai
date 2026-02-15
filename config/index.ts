import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getVesaiPaths, resolveVesaiHome } from "./paths";
import { type VesaiConfig, VesaiConfigSchema } from "./schema";

export { getVesaiPaths, resolveVesaiHome } from "./paths";
export type { VesaiConfig } from "./schema";
export { DEFAULT_VERTEX_MODEL, VesaiConfigSchema } from "./schema";

export async function ensureVesaiDirectories(homeDir?: string): Promise<void> {
  const paths = getVesaiPaths(homeDir ?? resolveVesaiHome());
  await Promise.all([
    mkdir(paths.home, { recursive: true }),
    mkdir(paths.workspace, { recursive: true }),
    mkdir(paths.sessionsDir, { recursive: true }),
    mkdir(paths.usersDir, { recursive: true }),
    mkdir(paths.groupsDir, { recursive: true }),
    mkdir(paths.jobsDir, { recursive: true }),
    mkdir(paths.cacheDir, { recursive: true }),
    mkdir(paths.logsDir, { recursive: true }),
    mkdir(paths.tmpDir, { recursive: true }),
    mkdir(dirname(paths.appDir), { recursive: true }),
  ]);
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed`));
      }
    });
  });
}

export async function ensureWorkspaceGitRepo(homeDir?: string): Promise<void> {
  const paths = getVesaiPaths(homeDir ?? resolveVesaiHome());
  const gitDir = `${paths.workspace}/.git`;

  try {
    await readFile(`${gitDir}/HEAD`, "utf8");
  } catch {
    await run("git", ["init", paths.workspace]);
  }

  await writeFile(
    `${paths.workspace}/.gitignore`,
    ["# VES AI workspace cache", ".DS_Store", "*.tmp"].join("\n") + "\n",
    "utf8"
  );
}

export async function loadConfig(homeDir?: string): Promise<VesaiConfig> {
  const paths = getVesaiPaths(homeDir ?? resolveVesaiHome());
  const raw = await readFile(paths.configFile, "utf8");
  const parsed = JSON.parse(raw);
  return VesaiConfigSchema.parse(parsed);
}

export async function tryLoadConfig(
  homeDir?: string
): Promise<VesaiConfig | null> {
  try {
    return await loadConfig(homeDir);
  } catch {
    return null;
  }
}

export async function saveConfig(
  config: Omit<VesaiConfig, "createdAt" | "updatedAt"> | VesaiConfig,
  homeDir?: string
): Promise<VesaiConfig> {
  const paths = getVesaiPaths(homeDir ?? resolveVesaiHome());
  await ensureVesaiDirectories(homeDir);

  const now = new Date().toISOString();
  const existing = await tryLoadConfig(homeDir);

  const fullConfig = VesaiConfigSchema.parse({
    ...config,
    createdAt: existing?.createdAt ?? (config as VesaiConfig).createdAt ?? now,
    updatedAt: now,
  });

  await writeFile(
    paths.configFile,
    JSON.stringify(fullConfig, null, 2),
    "utf8"
  );
  return fullConfig;
}

export async function updateConfig(params: {
  updater: (config: VesaiConfig) => VesaiConfig;
  homeDir?: string;
}): Promise<VesaiConfig> {
  const current = await requireConfig(params.homeDir);
  const next = params.updater(current);
  return saveConfig(next, params.homeDir);
}

export async function requireConfig(homeDir?: string): Promise<VesaiConfig> {
  const config = await tryLoadConfig(homeDir);
  if (!config) {
    throw new Error(
      "Missing config at ~/.vesai/vesai.json. Run `vesai quickstart` first."
    );
  }
  return config;
}
