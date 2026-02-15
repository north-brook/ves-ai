import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { runCommandOrThrow } from "./shell";

export function getPlaywrightChromiumExecutablePath(): string {
  return chromium.executablePath();
}

export function isPlaywrightChromiumInstalled(
  executablePath: string = getPlaywrightChromiumExecutablePath()
): boolean {
  return Boolean(executablePath) && existsSync(executablePath);
}

export async function ensurePlaywrightChromiumInstalled(params?: {
  resolveExecutablePath?: () => string;
  fileExists?: (path: string) => boolean;
  install?: () => Promise<void>;
}): Promise<string> {
  const resolveExecutablePath =
    params?.resolveExecutablePath ?? getPlaywrightChromiumExecutablePath;
  const fileExists = params?.fileExists ?? existsSync;
  const install =
    params?.install ??
    (async () => {
      await runCommandOrThrow("bunx", ["playwright", "install", "chromium"]);
    });

  const initialPath = resolveExecutablePath();
  if (initialPath && fileExists(initialPath)) {
    return initialPath;
  }

  await install();

  const installedPath = resolveExecutablePath();
  if (!(installedPath && fileExists(installedPath))) {
    throw new Error(
      "Playwright Chromium is not installed. Run `bunx playwright install chromium` and retry."
    );
  }

  return installedPath;
}
