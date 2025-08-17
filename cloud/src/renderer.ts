import { chromium, Page } from "playwright";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";

export type RenderResult = {
  webmPath: string;
  durationSeconds: number;
};

async function estimateDurationSeconds(expectedSeconds: number): Promise<number> {
  // Since we can't get exact duration from WebM without ffprobe,
  // we'll use the expected duration with a small buffer
  const bufferSeconds = Math.max(5, Math.min(expectedSeconds * 0.1, 10));
  return expectedSeconds + bufferSeconds;
}

async function tryStartPlayback(page: Page) {
  // Give the player time to initialize
  await page.waitForTimeout(1500);

  // Try semantic button locators first
  const candidates = [
    page.getByRole("button", { name: /play/i }),
    page.getByRole("button", { name: /resume/i }),
    page.getByRole("button", { name: /start/i }),
  ];

  for (const c of candidates) {
    try {
      await c.click({ timeout: 1500 });
      return;
    } catch {}
  }

  // Try spacebar (some players support it)
  try {
    await page.keyboard.press(" ");
    await page.waitForTimeout(500);
    return;
  } catch {}

  // Fallback: click the center of the viewport (works with large overlay play buttons)
  const { width, height } = page.viewportSize()!;
  await page.mouse.click(Math.floor(width / 2), Math.floor(height / 2));
}

export async function recordReplayToWebm(
  embedUrl: string,
  expectedSeconds: number,
): Promise<RenderResult> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ph-replay-"));
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: tmp, size: { width: 1920, height: 1080 } },
    });
    const page = await context.newPage();

    // Create a blank page with a fullscreen iframe around the embed URL (as requested)
    await page.setContent(
      `
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
        <body style="margin:0;padding:0;background:#000;overflow:hidden;">
          <iframe
            id="replay"
            src="${embedUrl}"
            style="position:fixed;top:0;left:0;width:100vw;height:100vh;border:0;"
            allow="fullscreen"
          ></iframe>
        </body>
      </html>
    `,
      { waitUntil: "domcontentloaded" },
    );

    // Wait for iframe load to settle
    await page.waitForTimeout(2500);

    // Start playback (click lands inside the iframe center)
    await tryStartPlayback(page);

    // Wait for expected playback time plus buffer
    const bufferMs = Math.max(10_000, Math.min(expectedSeconds * 250, 20_000));
    const waitMs = expectedSeconds * 1000 + bufferMs;
    await page.waitForTimeout(waitMs);

    // Close to finalize webm
    await page.close();

    const v = page.video();
    if (!v) throw new Error("No video artifact found from Playwright.");
    const webmPath = await v.path();
    const durationSeconds = await estimateDurationSeconds(expectedSeconds);

    return { webmPath, durationSeconds };
  } finally {
    await browser.close().catch(() => {});
  }
}
