import { chromium, Page } from "playwright";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

export type RenderResult = {
  videoPath: string;
  durationSeconds: number;
};

async function getExactDurationSeconds(
  videoPath: string,
  expectedSeconds: number,
): Promise<number> {
  try {
    // Use ffprobe to get exact duration
    const ffprobeOutput = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
      { encoding: "utf8" },
    ).trim();

    const duration = parseFloat(ffprobeOutput);
    if (!isNaN(duration) && duration > 0) {
      console.log(`  🎬 FFprobe exact duration: ${duration.toFixed(2)}s`);
      return duration;
    }
  } catch (e) {
    console.log(
      `  ⚠️ FFprobe failed, falling back to estimated duration: ${e}`,
    );
  }

  // Fallback to estimation if ffprobe fails
  const bufferSeconds = Math.max(5, Math.min(expectedSeconds * 0.1, 10));
  return expectedSeconds + bufferSeconds;
}

export async function recordReplayToWebm(
  embedUrl: string,
  expectedSeconds: number,
): Promise<RenderResult> {
  console.log(`🎥 [RECORDER] Starting recording process...`);
  console.log(`  🔗 Embed URL: ${embedUrl}`);
  console.log(`  ⏱️ Expected duration: ${expectedSeconds}s`);

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ph-replay-"));
  console.log(`  📁 Temp directory: ${tmp}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-blink-features=AutomationControlled",
      "--max_old_space_size=512", // Limit V8 memory
      "--js-flags=--max-old-space-size=512", // Limit JS heap
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  });
  console.log(`  🌐 Browser launched successfully`);

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: tmp, size: { width: 1920, height: 1080 } },
    });
    const page = await context.newPage();

    // Create a blank page with a fullscreen iframe around the embed URL
    // Add sandbox permissions to allow scripts and forms for player controls
    await page.goto(embedUrl);

    const { width, height } = page.viewportSize()!;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    console.log(`  ▶️ Starting playback`);

    // Start playback
    await page.waitForTimeout(5000);
    await page.mouse.click(centerX, centerY - 100);
    await page.mouse.click(centerX, centerY - 100);

    // Wait for expected playback time plus buffer
    const bufferMs = 10_000;
    const waitMs = expectedSeconds * 1000 + bufferMs;
    console.log(
      `🎦 [RECORDING] Recording for ${(waitMs / 1000).toFixed(1)}s (${expectedSeconds}s + ${(bufferMs / 1000).toFixed(1)}s buffer)`,
    );

    // Set up heartbeat logging
    const startTime = Date.now();
    const heartbeatInterval = 10_000; // Log every 10 seconds
    const heartbeat = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, (waitMs / 1000) - elapsed);
      console.log(
        `💓 [HEARTBEAT] Recording in progress... ${elapsed.toFixed(1)}s elapsed, ${remaining.toFixed(1)}s remaining`,
      );
    }, heartbeatInterval);

    try {
      await page.waitForTimeout(waitMs);
    } finally {
      clearInterval(heartbeat);
    }

    // Get video path before closing
    const v = page.video();
    if (!v) {
      console.error("❌ [ERROR] No video artifact found from Playwright!");
      throw new Error("No video artifact found from Playwright.");
    }

    // Close context to finalize webm (not just the page)
    console.log("💾 [FINALIZE] Closing context to save video...");
    await context.close();

    // Wait a bit for the video file to be fully written
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Force garbage collection if available (V8 flag needed)
    if (global.gc) {
      global.gc();
      console.log("♾️ [MEMORY] Forced garbage collection");
    }

    const videoPath = await v.path();

    // Check if video file exists and has content
    const stats = await fs.stat(videoPath);
    console.log(`📄 [VIDEO] File stats:`);
    console.log(`  📁 Path: ${videoPath}`);
    console.log(`  📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // If file is empty, throw an error
    if (stats.size === 0) {
      throw new Error(
        "Video file is empty (0 bytes) - recording may have failed",
      );
    }

    const durationSeconds = await getExactDurationSeconds(
      videoPath,
      expectedSeconds,
    );
    console.log(`  ⏱️ Duration: ${durationSeconds}s`);

    return { videoPath, durationSeconds };
  } finally {
    console.log("🏁 [CLEANUP] Closing browser...");
    await browser.close().catch((err) => {
      console.error(`⚠️ [WARNING] Browser close error: ${err}`);
    });
  }
}
