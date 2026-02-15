import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  getVesaiCorePaths,
  getVesaiPaths,
  resolveProjectRoot,
  resolveVesaiHome,
} from "./paths";
import { legacyConcurrencyToRenderMemoryMb } from "./runtime";
import {
  type CoreConfig,
  CoreConfigSchema,
  type ProjectConfig,
  ProjectConfigSchema,
  type VesaiConfig,
} from "./schema";

export {
  findProjectRoot,
  getVesaiCorePaths,
  getVesaiPaths,
  resolveProjectRoot,
  resolveVesaiHome,
} from "./paths";
export type { CoreConfig, ProjectConfig, VesaiConfig } from "./schema";
export {
  CoreConfigSchema,
  DEFAULT_VERTEX_MODEL,
  ProjectConfigSchema,
} from "./schema";

export async function ensureCoreDirectories(homeDir?: string): Promise<void> {
  const paths = getVesaiCorePaths(homeDir ?? resolveVesaiHome());
  await Promise.all([
    mkdir(paths.home, { recursive: true }),
    mkdir(paths.logsDir, { recursive: true }),
    mkdir(paths.tmpDir, { recursive: true }),
    mkdir(paths.renderLocksDir, { recursive: true }),
    mkdir(dirname(paths.appDir), { recursive: true }),
  ]);
}

export async function ensureProjectDirectories(
  projectRoot?: string
): Promise<void> {
  const paths = getVesaiPaths(projectRoot ?? resolveProjectRoot());
  await Promise.all([
    mkdir(paths.vesaiDir, { recursive: true }),
    mkdir(paths.workspace, { recursive: true }),
    mkdir(paths.sessionsDir, { recursive: true }),
    mkdir(paths.usersDir, { recursive: true }),
    mkdir(paths.groupsDir, { recursive: true }),
    mkdir(paths.researchDir, { recursive: true }),
    mkdir(paths.jobsDir, { recursive: true }),
    mkdir(paths.cacheDir, { recursive: true }),
    mkdir(paths.logsDir, { recursive: true }),
    mkdir(paths.tmpDir, { recursive: true }),
  ]);
}

// Backward-compatible alias retained for existing call sites.
export async function ensureVesaiDirectories(homeDir?: string): Promise<void> {
  await ensureCoreDirectories(homeDir);
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed`));
      }
    });
  });
}

export async function ensureWorkspaceGitRepo(
  projectRoot?: string
): Promise<void> {
  const paths = getVesaiPaths(projectRoot ?? resolveProjectRoot());
  const gitDir = join(paths.workspace, ".git");

  try {
    await readFile(join(gitDir, "HEAD"), "utf8");
  } catch {
    await run("git", ["init", paths.workspace]);
  }

  await writeFile(
    join(paths.workspace, ".gitignore"),
    ["# VES AI workspace cache", ".DS_Store", "*.tmp"].join("\n") + "\n",
    "utf8"
  );
}

export async function ensureProjectGitignore(
  projectRoot: string
): Promise<void> {
  const targetRoot = resolve(projectRoot);
  const gitignorePath = join(targetRoot, ".gitignore");

  let existing = "";
  try {
    existing = await readFile(gitignorePath, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code && code !== "ENOENT") {
      throw new Error(
        `Failed to read ${gitignorePath}. Ensure the file is writable and not locked.`
      );
    }
  }

  const lines = existing.split(/\r?\n/).map((line) => line.trim());
  if (lines.includes(".vesai/")) {
    return;
  }

  const next = existing
    ? `${existing.replace(/\s*$/, "")}\n.vesai/\n`
    : ".vesai/\n";

  try {
    await writeFile(gitignorePath, next, "utf8");
  } catch {
    throw new Error(
      `Failed to update ${gitignorePath}. It may be locked or read-only. Add '.vesai/' manually and fix file permissions.`
    );
  }
}

function combineConfig(core: CoreConfig, project: ProjectConfig): VesaiConfig {
  return {
    projectId: project.projectId,
    posthog: project.posthog,
    gcloud: core.gcloud,
    vertex: core.vertex,
    runtime: {
      maxRenderMemoryMb: core.runtime.maxRenderMemoryMb,
      lookbackDays: project.daemon.lookbackDays,
    },
    daemon: project.daemon,
    product: project.product,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    core,
    project,
  };
}

export async function loadCoreConfig(homeDir?: string): Promise<CoreConfig> {
  const paths = getVesaiCorePaths(homeDir ?? resolveVesaiHome());
  const raw = await readFile(paths.coreConfigFile, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const runtime =
    parsed.runtime && typeof parsed.runtime === "object"
      ? (parsed.runtime as Record<string, unknown>)
      : null;

  if (
    runtime &&
    runtime.maxRenderMemoryMb === undefined &&
    Number.isFinite(Number(runtime.maxConcurrentRenders))
  ) {
    runtime.maxRenderMemoryMb = legacyConcurrencyToRenderMemoryMb(
      Number(runtime.maxConcurrentRenders)
    );
  }

  return CoreConfigSchema.parse(parsed);
}

export async function tryLoadCoreConfig(
  homeDir?: string
): Promise<CoreConfig | null> {
  try {
    return await loadCoreConfig(homeDir);
  } catch {
    return null;
  }
}

export async function saveCoreConfig(
  config: Omit<CoreConfig, "createdAt" | "updatedAt"> | CoreConfig,
  homeDir?: string
): Promise<CoreConfig> {
  const paths = getVesaiCorePaths(homeDir ?? resolveVesaiHome());
  await ensureCoreDirectories(homeDir);

  const now = new Date().toISOString();
  const existing = await tryLoadCoreConfig(homeDir);

  const fullConfig = CoreConfigSchema.parse({
    ...config,
    createdAt: existing?.createdAt ?? (config as CoreConfig).createdAt ?? now,
    updatedAt: now,
  });

  await writeFile(
    paths.coreConfigFile,
    JSON.stringify(fullConfig, null, 2),
    "utf8"
  );
  return fullConfig;
}

export async function updateCoreConfig(params: {
  updater: (config: CoreConfig) => CoreConfig;
  homeDir?: string;
}): Promise<CoreConfig> {
  const current = await requireCoreConfig(params.homeDir);
  return saveCoreConfig(params.updater(current), params.homeDir);
}

export async function requireCoreConfig(homeDir?: string): Promise<CoreConfig> {
  const config = await tryLoadCoreConfig(homeDir);
  if (!config) {
    const paths = getVesaiCorePaths(homeDir ?? resolveVesaiHome());
    throw new Error(
      `Missing core config at ${paths.coreConfigFile}. Run \`vesai quickstart\` first.`
    );
  }
  return config;
}

export async function loadProjectConfig(
  projectRoot?: string
): Promise<ProjectConfig> {
  const paths = getVesaiPaths(projectRoot ?? resolveProjectRoot());
  const raw = await readFile(paths.configFile, "utf8");
  return ProjectConfigSchema.parse(JSON.parse(raw));
}

export async function tryLoadProjectConfig(
  projectRoot?: string
): Promise<ProjectConfig | null> {
  try {
    return await loadProjectConfig(projectRoot);
  } catch {
    return null;
  }
}

export async function saveProjectConfig(params: {
  config: Omit<ProjectConfig, "createdAt" | "updatedAt"> | ProjectConfig;
  projectRoot?: string;
}): Promise<ProjectConfig> {
  const root = params.projectRoot ?? resolveProjectRoot();
  const paths = getVesaiPaths(root);
  await ensureProjectDirectories(root);

  const now = new Date().toISOString();
  const existing = await tryLoadProjectConfig(root);

  const fullConfig = ProjectConfigSchema.parse({
    ...params.config,
    createdAt:
      existing?.createdAt ?? (params.config as ProjectConfig).createdAt ?? now,
    updatedAt: now,
  });

  await writeFile(
    paths.configFile,
    JSON.stringify(fullConfig, null, 2),
    "utf8"
  );
  return fullConfig;
}

export async function updateProjectConfig(params: {
  updater: (config: ProjectConfig) => ProjectConfig;
  projectRoot?: string;
}): Promise<ProjectConfig> {
  const root = params.projectRoot ?? resolveProjectRoot();
  const current = await requireProjectConfig(root);
  return saveProjectConfig({
    config: params.updater(current),
    projectRoot: root,
  });
}

export async function requireProjectConfig(
  projectRoot?: string
): Promise<ProjectConfig> {
  const root = projectRoot ?? resolveProjectRoot();
  const config = await tryLoadProjectConfig(root);
  if (!config) {
    const paths = getVesaiPaths(root);
    throw new Error(
      `Missing project config at ${paths.configFile}. Run \`vesai init\` in your project root first.`
    );
  }
  return config;
}

export async function loadConfig(projectRoot?: string): Promise<VesaiConfig> {
  const root = projectRoot ?? resolveProjectRoot();
  const [core, project] = await Promise.all([
    requireCoreConfig(),
    loadProjectConfig(root),
  ]);
  return combineConfig(core, project);
}

export async function tryLoadConfig(
  projectRoot?: string
): Promise<VesaiConfig | null> {
  try {
    return await loadConfig(projectRoot);
  } catch {
    return null;
  }
}

export async function requireConfig(
  projectRoot?: string
): Promise<VesaiConfig> {
  const config = await tryLoadConfig(projectRoot);
  if (!config) {
    throw new Error(
      "Missing core and/or project config. Run `vesai quickstart` (global) and `vesai init` (project) first."
    );
  }
  return config;
}
