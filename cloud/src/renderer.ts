import { chromium, Page } from "playwright";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

export type RenderResult = {
  webmPath: string;
  durationSeconds: number;
};

async function getExactDurationSeconds(webmPath: string, expectedSeconds: number): Promise<number> {
  try {
    // Use ffprobe to get exact duration
    const ffprobeOutput = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${webmPath}"`,
      { encoding: 'utf8' }
    ).trim();
    
    const duration = parseFloat(ffprobeOutput);
    if (!isNaN(duration) && duration > 0) {
      console.log(`  🎬 FFprobe exact duration: ${duration.toFixed(2)}s`);
      return duration;
    }
  } catch (e) {
    console.log(`  ⚠️ FFprobe failed, falling back to estimated duration: ${e}`);
  }
  
  // Fallback to estimation if ffprobe fails
  const bufferSeconds = Math.max(5, Math.min(expectedSeconds * 0.1, 10));
  return expectedSeconds + bufferSeconds;
}

async function validateVideoFile(webmPath: string, expectedSeconds: number): Promise<void> {
  const stats = await fs.stat(webmPath);
  const minExpectedSize = expectedSeconds * 10000; // Very rough estimate: ~10KB per second minimum
  
  if (stats.size < minExpectedSize) {
    console.error(`⚠️ [VALIDATION] Video file may be corrupted:`);
    console.error(`  📄 Size: ${stats.size} bytes`);
    console.error(`  🎯 Expected minimum: ${minExpectedSize} bytes`);
    
    // Try to use ffprobe if available to get more info
    try {
      const ffprobeOutput = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${webmPath}"`,
        { encoding: 'utf8' }
      ).trim();
      console.log(`  🎦 FFprobe duration: ${ffprobeOutput}s`);
    } catch (e) {
      console.log(`  🔍 FFprobe not available for detailed analysis`);
    }
  }
}

async function tryStartPlayback(page: Page) {
  console.log("🎮 [PLAYBACK] Attempting to start playback...");
  
  // Give the player time to initialize
  await page.waitForTimeout(2000);

  // IMPORTANT: Click the center of the iframe/viewport multiple times
  // This is critical for embedded PostHog recordings
  const { width, height } = page.viewportSize()!;
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  console.log(`  🎯 Clicking center of viewport at (${centerX}, ${centerY})`);
  
  // Try multiple clicks with small delays to ensure playback starts
  for (let i = 0; i < 3; i++) {
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(500);
    
    // Also try clicking slightly offset positions in case there's a small play button
    if (i === 1) {
      await page.mouse.click(centerX - 50, centerY);
      await page.waitForTimeout(300);
      await page.mouse.click(centerX + 50, centerY);
      await page.waitForTimeout(300);
    }
  }
  
  console.log("  ✅ Performed multiple center clicks for playback");

  // Also try keyboard shortcuts as backup
  try {
    await page.keyboard.press(" "); // Spacebar
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter"); // Enter key
    await page.waitForTimeout(200);
    console.log("  ⌨️ Sent keyboard commands (Space, Enter)");
  } catch {}

  // Try to find and click any visible buttons as last resort
  try {
    const buttons = await page.locator('button:visible, [role="button"]:visible').all();
    if (buttons.length > 0) {
      console.log(`  🔍 Found ${buttons.length} visible buttons, clicking first one`);
      await buttons[0].click({ timeout: 500 });
    }
  } catch {}
  
  // Final wait to let playback stabilize
  await page.waitForTimeout(1000);
  console.log("  ✅ Playback initialization complete");
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
    await page.setContent(
      `
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1"/>
        </head>
        <body style="margin:0;padding:0;background:#000;overflow:hidden;">
          <iframe
            id="replay"
            src="${embedUrl}"
            style="position:fixed;top:0;left:0;width:100vw;height:100vh;border:0;"
            allow="fullscreen; autoplay"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          ></iframe>
        </body>
      </html>
    `,
      { waitUntil: "domcontentloaded" },
    );

    // Wait for iframe load to settle and verify it's loaded
    console.log("🕒 [WAIT] Allowing iframe to fully load...");
    await page.waitForTimeout(4000); // Increased wait time for better stability
    
    // Try to verify iframe is loaded
    try {
      const iframe = await page.locator('#replay');
      const isVisible = await iframe.isVisible();
      console.log(`  🔍 Iframe visibility: ${isVisible ? '✅ Visible' : '❌ Not visible'}`);
    } catch (e) {
      console.log(`  ⚠️ Could not verify iframe state`);
    }

    // Start playback (click lands inside the iframe center)
    await tryStartPlayback(page);

    // Wait for expected playback time plus buffer
    // For longer recordings, add more buffer to ensure we capture everything
    const bufferMs = expectedSeconds > 30 
      ? Math.max(15_000, Math.min(expectedSeconds * 300, 30_000))  // Longer buffer for long videos
      : Math.max(10_000, Math.min(expectedSeconds * 250, 20_000));
    const waitMs = expectedSeconds * 1000 + bufferMs;
    console.log(`🎦 [RECORDING] Recording for ${(waitMs/1000).toFixed(1)}s (${expectedSeconds}s + ${(bufferMs/1000).toFixed(1)}s buffer)`);
    
    // For long recordings, periodically check that the page is still responsive
    if (expectedSeconds > 30) {
      const checkInterval = 10000; // Check every 10 seconds
      const checks = Math.floor(waitMs / checkInterval);
      
      for (let i = 0; i < checks; i++) {
        await page.waitForTimeout(checkInterval);
        console.log(`  ⏳ Recording progress: ${((i + 1) * checkInterval / 1000).toFixed(0)}s / ${(waitMs/1000).toFixed(0)}s`);
        
        // Try to keep the page active with small mouse movements
        try {
          await page.mouse.move(100, 100);
          await page.mouse.move(200, 200);
        } catch {}
      }
      
      // Wait for any remaining time
      const remainingMs = waitMs - (checks * checkInterval);
      if (remainingMs > 0) {
        await page.waitForTimeout(remainingMs);
      }
    } else {
      await page.waitForTimeout(waitMs);
    }

    // Close to finalize webm
    console.log("💾 [FINALIZE] Closing page to save video...");
    await page.close();

    const v = page.video();
    if (!v) {
      console.error("❌ [ERROR] No video artifact found from Playwright!");
      throw new Error("No video artifact found from Playwright.");
    }
    
    const webmPath = await v.path();
    
    // Check if video file exists and has content
    const stats = await fs.stat(webmPath);
    console.log(`📄 [VIDEO] File stats:`);
    console.log(`  📁 Path: ${webmPath}`);
    console.log(`  📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Validate video file
    await validateVideoFile(webmPath, expectedSeconds);
    
    const durationSeconds = await getExactDurationSeconds(webmPath, expectedSeconds);
    console.log(`  ⏱️ Duration: ${durationSeconds}s`);

    return { webmPath, durationSeconds };
  } finally {
    console.log("🏁 [CLEANUP] Closing browser...");
    await browser.close().catch((err) => {
      console.error(`⚠️ [WARNING] Browser close error: ${err}`);
    });
  }
}
