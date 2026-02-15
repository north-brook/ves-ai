import { describe, expect, it, mock } from "bun:test";
import {
  ensurePlaywrightChromiumInstalled,
  isPlaywrightChromiumInstalled,
} from "../packages/connectors/src/playwright";

describe("playwright connector", () => {
  it("returns installed path when browser executable already exists", async () => {
    const install = mock(async () => {});

    const path = await ensurePlaywrightChromiumInstalled({
      resolveExecutablePath: () => "/tmp/chrome",
      fileExists: () => true,
      install,
    });

    expect(path).toBe("/tmp/chrome");
    expect(install).not.toHaveBeenCalled();
  });

  it("installs browser when executable is missing", async () => {
    const fileExists = mock((path: string) => path.includes("after"));
    const install = mock(async () => {});
    let calls = 0;

    const path = await ensurePlaywrightChromiumInstalled({
      resolveExecutablePath: () => {
        calls += 1;
        return calls === 1 ? "/tmp/before/chrome" : "/tmp/after/chrome";
      },
      fileExists,
      install,
    });

    expect(path).toBe("/tmp/after/chrome");
    expect(install).toHaveBeenCalledTimes(1);
  });

  it("throws helpful error when executable remains missing after install", async () => {
    await expect(
      ensurePlaywrightChromiumInstalled({
        resolveExecutablePath: () => "/tmp/missing/chrome",
        fileExists: () => false,
        install: async () => {},
      })
    ).rejects.toThrow(
      "Playwright Chromium is not installed. Run `bunx playwright install chromium` and retry."
    );
  });

  it("reports installation status from path existence", () => {
    expect(isPlaywrightChromiumInstalled("/tmp/missing")).toBe(false);
  });
});
