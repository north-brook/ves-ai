import { test } from "@playwright/test";

test.skip("play posthog recording", async ({ page }) => {
  test.slow();

  await page.goto(
    "https://us.posthog.com/embedded/je7U8rkewGy-fWCgXQnSPythiMI3Hw",
  );

  const { width, height } = page.viewportSize()!;
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  console.log(`  🎯 Clicking center of viewport at (${centerX}, ${centerY})`);

  await page.waitForTimeout(2000);
  await page.mouse.click(centerX, centerY - 100);
  await page.mouse.click(centerX, centerY - 100);

  // wait 30 seconds
  await page.waitForTimeout(30000);
});
