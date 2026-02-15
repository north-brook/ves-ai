import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getVesaiPaths, resolveVesaiHome } from "../../config/src";

export type SessionMarkdown = {
  id: string;
  title: string;
  frontmatter: Record<string, unknown>;
  body: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toFrontmatter(data: Record<string, unknown>): string {
  const lines = Object.entries(data).map(([key, value]) => {
    if (Array.isArray(value) || typeof value === "object") {
      return `${key}: ${JSON.stringify(value)}`;
    }
    if (typeof value === "string") {
      return `${key}: ${JSON.stringify(value)}`;
    }
    return `${key}: ${String(value)}`;
  });

  return `---\n${lines.join("\n")}\n---`;
}

async function writeMarkdown(params: {
  folder: string;
  id: string;
  name: string;
  frontmatter: Record<string, unknown>;
  body: string;
  homeDir?: string;
}): Promise<string> {
  const paths = getVesaiPaths(params.homeDir ?? resolveVesaiHome());
  const targetDir = join(paths.workspace, params.folder);
  await mkdir(targetDir, { recursive: true });

  const fileName = `${slugify(params.name || params.id)}-${slugify(params.id)}.md`;
  const target = join(targetDir, fileName);

  const content = `${toFrontmatter(params.frontmatter)}\n\n# ${params.name}\n\n${params.body.trim()}\n`;
  await writeFile(target, content, "utf8");
  return target;
}

export async function writeSessionMarkdown(params: {
  id: string;
  name: string;
  frontmatter: Record<string, unknown>;
  body: string;
  homeDir?: string;
}): Promise<string> {
  return writeMarkdown({
    folder: "sessions",
    id: params.id,
    name: params.name,
    frontmatter: params.frontmatter,
    body: params.body,
    homeDir: params.homeDir,
  });
}

export async function writeUserMarkdown(params: {
  id: string;
  name: string;
  frontmatter: Record<string, unknown>;
  body: string;
  homeDir?: string;
}): Promise<string> {
  return writeMarkdown({
    folder: "users",
    id: params.id,
    name: params.name,
    frontmatter: params.frontmatter,
    body: params.body,
    homeDir: params.homeDir,
  });
}

export async function writeGroupMarkdown(params: {
  id: string;
  name: string;
  frontmatter: Record<string, unknown>;
  body: string;
  homeDir?: string;
}): Promise<string> {
  return writeMarkdown({
    folder: "groups",
    id: params.id,
    name: params.name,
    frontmatter: params.frontmatter,
    body: params.body,
    homeDir: params.homeDir,
  });
}
