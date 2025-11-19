import { join, resolve as pathResolve } from "node:path";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { chromium, LaunchOptions } from "playwright";
import { pipeline } from "node:stream/promises";
import { Storage } from "@google-cloud/storage";

// rrweb EventType.Meta = 4
const RRWEB_EVENT_META = 4;

// --------------------------------------------------------
// Inline "rrvideo" replacement using Playwright directly
// --------------------------------------------------------

const requireFromHere = createRequire(__filename);
async function readRrwebAssets() {
  // Get rrweb build for the Replayer class - using the all-in-one bundle
  // The main entry point is at node_modules/rrweb/lib/index.js
  // We need the dist files at node_modules/rrweb/dist/
  const rrwebMain = requireFromHere.resolve("rrweb");
  // Go from lib/index.js to dist/
  const rrwebDistDir = pathResolve(rrwebMain, "../../dist");
  const rrwebPath = pathResolve(rrwebDistDir, "rrweb-all.js");
  const rrwebCssPath = pathResolve(rrwebDistDir, "rrweb-all.css");

  const rrwebScript = await fs.readFile(rrwebPath, "utf-8");
  const rrwebCss = await fs.readFile(rrwebCssPath, "utf-8");

  return {
    script: rrwebScript,
    css: rrwebCss,
  };
}

function buildReplayHtml(
  eventsJson: string,
  assets: { script: string; css: string },
  opts: {
    width: number;
    height: number;
    speed: number;
    skipInactive: boolean;
    inactiveThreshold?: number;
    mouseTail?: {
      strokeStyle?: string;
      lineWidth?: number;
      duration?: number;
      lineCap?: string;
    };
  },
): string {
  const safeEvents = eventsJson.replace(/<\/script>/g, "<\\/script>");

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${assets.css}</style>
    <style>
      html, body { 
        margin: 0; 
        padding: 0; 
        background: #000;
        width: ${opts.width}px;
        height: ${opts.height}px;
        overflow: hidden;
      }
      .replayer-wrapper {
        position: relative;
        width: ${opts.width}px;
        height: ${opts.height}px;
      }
      .replayer-wrapper iframe {
        background: #000 !important;
      }
      /* Hide any mouse tail or controller UI */
      .replayer-mouse-tail {
        display: ${opts.mouseTail ? "block" : "none"};
      }
      /* Skipping overlay */
      #skip-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        pointer-events: none;
      }
      #skip-overlay.active {
        display: flex;
      }
      #skip-overlay-text {
        color: white;
        font-size: 48px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 600;
        text-align: center;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      }
    </style>
  </head>
  <body>
    <div id="replayer" class="replayer-wrapper">
      <div id="skip-overlay">
        <div>
          <div id="skip-overlay-text">Skipping inactivity...</div>
        </div>
      </div>
    </div>
    <script>
      ${assets.script}
      
      // Setup rrweb Replayer directly
      (async function() {
        const __events = ${safeEvents};
        
        // Extract segments from custom event
        let segments = [];
        let segmentEventIndex = -1;
        for (let i = 0; i < __events.length; i++) {
          const evt = __events[i];
          if (evt.type === 5 && evt.data && evt.data.tag === 'replay-segments') {
            segments = evt.data.payload.segments || [];
            segmentEventIndex = i;
            console.log('Found', segments.length, 'segments in recording');
            break;
          }
        }
        
        // Remove segment event so it doesn't interfere with replay
        if (segmentEventIndex >= 0) {
          __events.splice(segmentEventIndex, 1);
        }
        
        console.log('Initializing Replayer with dynamic speed control');
        console.log('Starting replay with', __events.length, 'events');
        
        // Debug segments
        if (segments.length > 0) {
          let totalActive = 0;
          let totalInactive = 0;
          segments.forEach(seg => {
            if (seg.isActive) totalActive += seg.duration;
            else totalInactive += seg.duration;
          });
          console.log('Active time:', (totalActive/1000).toFixed(1) + 's');
          console.log('Inactive time:', (totalInactive/1000).toFixed(1) + 's');
          console.log('Skip savings:', ((totalInactive * 0.98) / 1000).toFixed(1) + 's');
        }
        
        // Track timing
        window.__startTime = Date.now();
        window.__lastProgressTime = Date.now();
        let currentTime = 0;
        let totalTime = 0;
        let isFinished = false;
        let animationFrameId = null;

        // Get base timestamp for segment analytics logging
        const baseTimestamp = __events[0]?.timestamp || 0;

        // Debug: Log all segments
        console.log('=== SEGMENTS DEBUG ===');
        console.log('Base timestamp:', baseTimestamp);
        segments.forEach((seg, i) => {
          const relativeStart = seg.startTime - baseTimestamp;
          const relativeEnd = seg.endTime - baseTimestamp;
          console.log('Segment', i, ':', {
            isActive: seg.isActive,
            absoluteTime: seg.startTime + '-' + seg.endTime,
            relativeTime: (relativeStart/1000).toFixed(1) + 's-' + (relativeEnd/1000).toFixed(1) + 's',
            duration: ((seg.endTime - seg.startTime) / 1000).toFixed(1) + 's'
          });
        });

        // Normalize segment timestamps to relative time to match replayer.getCurrentTime()
        // getCurrentTime() returns milliseconds from start, but segments use absolute Unix timestamps
        segments = segments.map(seg => ({
          ...seg,
          startTime: seg.startTime - baseTimestamp,
          endTime: seg.endTime - baseTimestamp
        }));
        console.log('✅ Normalized', segments.length, 'segments to relative time for getCurrentTime() matching');

        try {
          // Create Replayer instance using rrweb directly
          // We manually control speed based on segments (PostHog approach)
          const replayer = new rrweb.Replayer(__events, {
            root: document.getElementById('replayer'),
            skipInactive: false,  // Manually control speed via segments
            speed: ${opts.speed},
            maxSpeed: 360,
            mouseTail: ${opts.mouseTail ? JSON.stringify(opts.mouseTail) : "false"},
            triggerFocus: true,
            pauseAnimation: true,
            UNSAFE_replayCanvas: false,
            showWarning: true,
            showDebug: true,
            blockClass: 'rr-block',
            useVirtualDom: true,
            liveMode: false,
            insertStyleRules: []
          });
          
          window.replayer = replayer;
          
          // Get metadata
          const meta = replayer.getMetaData();
          totalTime = meta.totalTime || 0;
          
          console.log('Replay metadata:', {
            startTime: meta.startTime,
            endTime: meta.endTime,
            totalTime: totalTime
          });
          
          // Debug: Check if getCurrentTime works
          console.log('Initial getCurrentTime:', replayer.getCurrentTime());
          console.log('First event timestamp:', __events[0]?.timestamp);
          console.log('Last event timestamp:', __events[__events.length - 1]?.timestamp);

          // Segment tracking state (PostHog approach)
          let currentSegmentIndex = -1;
          let lastSegmentIndex = -1;
          let isSkippingInactivity = false;
          const baseSpeed = ${opts.speed};
          const skipOverlay = document.getElementById('skip-overlay');

          // Helper: Find segment for given timestamp
          function getCurrentSegment(timestamp) {
            if (!segments || segments.length === 0) return null;

            for (let i = 0; i < segments.length; i++) {
              const seg = segments[i];
              if (timestamp >= seg.startTime && timestamp <= seg.endTime) {
                return { segment: seg, index: i };
              }
            }
            return null;
          }

          // Helper: Calculate playback speed (PostHog approach)
          function calculatePlaybackSpeed(segment, currentTime, isSkipping) {
            if (!isSkipping || !segment) {
              return baseSpeed;
            }

            // Dynamic speed based on remaining time in inactive segment
            const remainingSeconds = (segment.endTime - currentTime) / 1000;
            return Math.max(50, remainingSeconds);
          }

          console.log('🎮 [SKIP CONTROL] Manual speed control initialized with', segments.length, 'segments');

          // Set up event listeners
          replayer.on('finish', () => {
            isFinished = true;
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
            }

            const elapsed = (Date.now() - window.__startTime) / 1000;
            console.log('Replay finished after', elapsed.toFixed(1) + 's');
            try {
              window.onReplayFinish && window.onReplayFinish();
            } catch(e) {
              console.error('Error in onReplayFinish:', e);
            }
          });

          replayer.on('fullsnapshot-rebuilded', () => {
            const doc = replayer.iframe.contentDocument;
            if (!doc) return;

            // Use the recorded page URL as the base
            const baseHref = (__events.find(e => e.type === 4 /* Meta */)?.data?.href) || '';
            if (baseHref && !doc.querySelector('base')) {
              const base = doc.createElement('base');
              base.href = baseHref;
              doc.head.prepend(base);
            }

            // Rewrite root-relative <link href="/..."> to absolute
            const origin = baseHref ? new URL(baseHref).origin : '';
            doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
              const href = link.getAttribute('href');
              if (href && href.startsWith('/') && origin) {
                link.href = origin + href;
              }
            });
          });

          // Track progress with segment-based speed control
          function updateProgress() {
            if (!isFinished && replayer) {
              try {
                currentTime = replayer.getCurrentTime();
                const progress = totalTime > 0 ? currentTime / totalTime : 0;
                const percent = Math.round(progress * 100);
                const elapsed = (Date.now() - window.__startTime) / 1000;
                const timeSinceLastProgress = Date.now() - window.__lastProgressTime;

                // Segment-based speed control (PostHog approach)
                const segmentResult = getCurrentSegment(currentTime);
                if (segmentResult) {
                  const newSegmentIndex = segmentResult.index;
                  const segment = segmentResult.segment;

                  // Detect segment change (including transitioning from gap to segment)
                  if (newSegmentIndex !== currentSegmentIndex) {
                    currentSegmentIndex = newSegmentIndex;
                    lastSegmentIndex = newSegmentIndex;

                    // Update skipping state based on segment activity
                    const wasSkipping = isSkippingInactivity;
                    isSkippingInactivity = !segment.isActive;

                    // Calculate and set new speed
                    const newSpeed = calculatePlaybackSpeed(segment, currentTime, isSkippingInactivity);
                    replayer.setConfig({ speed: newSpeed });

                    // Update overlay visibility
                    if (skipOverlay) {
                      if (isSkippingInactivity) {
                        skipOverlay.classList.add('active');
                      } else {
                        skipOverlay.classList.remove('active');
                      }
                    }

                    // Log segment transition
                    const action = isSkippingInactivity ? 'SKIPPING' : 'PLAYING';
                    const source = wasSkipping && currentSegmentIndex === -1 ? 'from GAP' : '';
                    console.log('🎮 [SEGMENT CHANGE]', action, 'segment', currentSegmentIndex, source, 'at speed', newSpeed.toFixed(1) + 'x');
                  } else if (isSkippingInactivity) {
                    // Recalculate speed within inactive segment for dynamic adjustment
                    const newSpeed = calculatePlaybackSpeed(segment, currentTime, isSkippingInactivity);
                    replayer.setConfig({ speed: newSpeed });
                  }
                } else {
                  // No segment found - this is a GAP between segments
                  // PostHog marks all gaps as inactive, so skip them
                  if (currentSegmentIndex !== -1) {
                    // Transition from segment to gap
                    currentSegmentIndex = -1;
                    isSkippingInactivity = true;

                    // Look ahead to see if we're approaching an active segment
                    // This prevents fast-forwarding through interactions after tab returns
                    const nextSegment = segments.find(s => s.startTime > currentTime);
                    const timeToNextSegment = nextSegment ? nextSegment.startTime - currentTime : Infinity;

                    // If next segment is active and within 500ms, slow down preemptively
                    // This ensures smooth transitions and prevents skipping through actual interactions
                    const gapSpeed = (nextSegment?.isActive && timeToNextSegment < 500)
                      ? baseSpeed    // Slow to normal speed when approaching activity
                      : 360;         // Otherwise skip at max speed

                    replayer.setConfig({ speed: gapSpeed });

                    // Show skip overlay only if actually skipping
                    if (skipOverlay) {
                      if (gapSpeed > baseSpeed) {
                        skipOverlay.classList.add('active');
                      } else {
                        skipOverlay.classList.remove('active');
                      }
                    }

                    const status = gapSpeed > baseSpeed ? 'speed: ' + gapSpeed + 'x' : 'approaching active segment';
                    console.log('🎮 [GAP]', status, 'at', (currentTime/1000).toFixed(1) + 's');
                  }
                }

                // Log at intervals
                if (timeSinceLastProgress > 2000 || percent === 100) {
                  console.log('Progress:', percent + '%', 'at', elapsed.toFixed(1) + 's');
                  window.__lastProgressTime = Date.now();

                  // Notify host
                  try {
                    window.onReplayProgressUpdate && window.onReplayProgressUpdate({ payload: progress });
                  } catch(e) {}
                }

                // Continue tracking
                if (!isFinished) {
                  animationFrameId = requestAnimationFrame(updateProgress);
                }
              } catch(e) {
                console.error('Error updating progress:', e);
              }
            }
          }
          
          // Start playback
          console.log('Starting playback...');
          replayer.play(0);
          
          // Start progress tracking
          updateProgress();
          
        } catch(e) {
          console.error('Failed to initialize Replayer:', e);
          if (e.stack) {
            console.error('Stack trace:', e.stack);
          }
          // Signal finish on error to prevent hanging
          try { 
            window.onReplayFinish && window.onReplayFinish(); 
          } catch(e2) {}
        }
      })();
      
      // Error handling
      window.addEventListener('error', (e) => {
        console.error('[ERROR]', e.message, 'at', e.filename, ':', e.lineno, ':', e.colno);
        if (e.error && e.error.stack) {
          console.error('[STACK]', e.error.stack);
        }
      });
    </script>
  </body>
</html>`;
}

async function moveFile(src: string, dest: string) {
  try {
    await fs.rename(src, dest);
  } catch {
    // cross-device fallback
    const rs = createWriteStream(dest);
    await fs.copyFile(src, dest);
    rs.close();
    await fs.unlink(src);
  }
}

// --------------------------------------------------------
// Main entry: REPLAY events via Playwright -> return WEBM
// --------------------------------------------------------

export default async function constructVideo(params: {
  projectId: string;
  sessionId: string;
  eventsPath: string;
  config?: {
    width?: number;
    height?: number;
    speed?: number;
    skipInactive?: boolean;
    mouseTail?: {
      strokeStyle?: string;
      lineWidth?: number;
      duration?: number;
      lineCap?: string;
    };
  };
}): Promise<{
  videoPath: string;
  videoDuration: number;
  videoUri: string;
}> {
  const { eventsPath, config = {} } = params;

  // Read events from file and parse metadata
  const eventsJson = await fs.readFile(eventsPath, "utf-8");
  const allEvents = JSON.parse(eventsJson);

  // Get max viewport dimensions from Meta events
  let maxViewportWidth = 0;
  let maxViewportHeight = 0;

  for (const event of allEvents) {
    if (event.type === RRWEB_EVENT_META && event.data) {
      const w = Number(event.data.width);
      const h = Number(event.data.height);
      if (Number.isFinite(w) && w > maxViewportWidth) maxViewportWidth = w;
      if (Number.isFinite(h) && h > maxViewportHeight) maxViewportHeight = h;
    }
  }

  // Calculate duration
  const firstTimestamp = allEvents[0]?.timestamp || 0;
  const lastTimestamp = allEvents[allEvents.length - 1]?.timestamp || 0;
  const duration = (lastTimestamp - firstTimestamp) / 1000;

  console.log(`🎬 [REPLAY] Replaying with vanilla rrweb-player...`);
  console.log(`📊 [REPLAY] Duration: ${duration.toFixed(1)}s`);
  console.log(
    `📊 [REPLAY] Max viewport: ${maxViewportWidth}x${maxViewportHeight}`,
  );

  // Get output path from eventsPath
  const workDir = eventsPath.substring(0, eventsPath.lastIndexOf("/"));
  const externalId =
    eventsPath.match(/recording-([^.]+)\.json$/)?.[1] || "unknown";
  const outPath = join(workDir, `recording-${externalId}.webm`);

  // Debug: Save events with delay to verify
  const debugPath = join(workDir, `debug-${externalId}.json`);
  await fs.writeFile(debugPath, JSON.stringify(allEvents), "utf-8");
  console.log(`📝 [REPLAY] Debug events saved to: ${debugPath}`);

  // Also save to dist for inspection
  try {
    const distDebugPath = join(__dirname, `debug-${externalId}.json`);
    const distSamplePath = join(__dirname, `debug-sample-${externalId}.json`);
    await fs.writeFile(distDebugPath, JSON.stringify(allEvents), "utf-8");
    // Save sample (first 100 events) for easier inspection
    await fs.writeFile(
      distSamplePath,
      JSON.stringify(allEvents.slice(0, 100), null, 2),
      "utf-8",
    );
    console.log(`📝 [REPLAY] Debug files also saved to dist/`);
  } catch (e) {
    console.log(`⚠️ [REPLAY] Could not save debug files to dist:`, e);
  }

  // Defaults
  const width = config.width || Math.max(1, maxViewportWidth || 1400);
  const height = config.height || Math.max(1, maxViewportHeight || 900);
  const speed = config.speed ?? 1;
  const skipInactive = config.skipInactive ?? true; // Always skip inactive periods
  const inactiveThreshold = 5000; // 5 seconds of inactivity triggers skip (matching PostHog)
  const mouseTail = config.mouseTail;

  // Read rrweb assets
  const assets = await readRrwebAssets();

  // Build the replay HTML
  const html = buildReplayHtml(eventsJson, assets, {
    width,
    height,
    speed,
    skipInactive,
    inactiveThreshold,
    mouseTail,
  });

  // Write HTML to file
  const htmlPath = join(workDir, `recording-${externalId}.html`);
  await fs.writeFile(htmlPath, html, "utf-8");
  console.log(`📝 [REPLAY] HTML written to: ${htmlPath}`);

  // Calculate expected duration for timeout
  const expectedDuration = Math.max((duration / speed) * 1000, 30000); // At least 30s
  const timeout = expectedDuration * 2 + 120000; // 2x expected + 2 minutes buffer

  // Launch browser with optimized settings
  const launchOptions: LaunchOptions = {
    headless: true,
    args: [
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-blink-features=AutomationControlled",
      "--window-size=1920,1080",
      "--force-device-scale-factor=1",
    ],
  };

  // Try Chromium first
  const browser = await chromium.launch(launchOptions);

  console.log(`🌐 [REPLAY] Browser launched: ${browser.version()}`);

  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      recordVideo: {
        dir: workDir,
        size: { width, height },
      },
      ignoreHTTPSErrors: true,
      reducedMotion: "no-preference",
    });

    const page = await context.newPage();

    // Track progress and finish
    let isFinished = false;
    let lastLoggedProgress = -1;
    let lastProgressLogTime = Date.now();

    // Capture console messages from the browser with better deduplication
    page.on("console", (msg: any) => {
      const type = msg.type();
      const text = msg.text();

      // For errors, always log with full details
      if (type === "error") {
        console.error(`🌐 [BROWSER ERROR] ${text}`);
        // Try to get more info from the error
        msg.args().forEach(async (arg: any) => {
          try {
            const value = await arg.jsonValue();
            if (value && typeof value === "object" && value.stack) {
              console.error(`  Stack trace:`, value.stack);
            }
          } catch (e) {
            // Ignore errors getting arg values
          }
        });
        return;
      }

      // For other messages, only log if important
      if (
        text.includes("finished") ||
        text.includes("started") ||
        text.includes("Starting replay") ||
        text.includes("Found") ||
        text.includes("First") ||
        text.includes("skipInactive")
      ) {
        console.log(`🌐 [BROWSER] ${text}`);
      }
    });

    page.on("pageerror", (error: any) => {
      console.error(`💥 [PAGE ERROR]`, error.message);
    });

    await page.exposeFunction("onReplayProgressUpdate", (p: any) => {
      if (p?.payload) {
        const percent = Math.round(p.payload * 100);
        const now = Date.now();

        // Only log progress at 10% intervals or if 5+ seconds have passed
        const shouldLog =
          percent !== lastLoggedProgress &&
          (percent % 10 === 0 ||
            percent === 100 ||
            now - lastProgressLogTime > 5000);

        if (shouldLog) {
          console.log(`📊 [REPLAY] Progress: ${percent}%`);
          lastLoggedProgress = percent;
          lastProgressLogTime = now;
        }
      }
    });

    await page.exposeFunction("onReplayFinish", () => {
      isFinished = true;
      console.log(`✅ [REPLAY] Replay finished signal received`);
    });

    // Navigate and start
    console.log(`🎬 [REPLAY] Loading replay HTML...`);
    await page.goto(`file://${htmlPath}`, { waitUntil: "domcontentloaded" });

    // Wait for either finish or timeout
    const startTime = Date.now();
    const pollInterval = 1000;
    let warningShown = false;

    while (!isFinished) {
      await new Promise((r) => setTimeout(r, pollInterval));
      const elapsed = Date.now() - startTime;

      if (elapsed > timeout) {
        console.warn(
          `⏱️ [REPLAY] Timeout after ${(elapsed / 1000).toFixed(1)}s`,
        );
        break;
      }

      if (!warningShown && elapsed > expectedDuration * 1.5) {
        console.warn(
          `⚠️ [REPLAY] Taking longer than expected (${(elapsed / 1000).toFixed(1)}s elapsed)`,
        );
        warningShown = true;
      }
    }

    const replayDuration = (Date.now() - startTime) / 1000;
    console.log(
      `⏱️ [REPLAY] Replay completed in ${replayDuration.toFixed(1)}s`,
    );

    // Close to save video
    await page.close();
    await context.close();

    // Find the video file
    const files = await fs.readdir(workDir);
    const videoFile = files.find(
      (f) => f.endsWith(".webm") && f !== `recording-${externalId}.webm`,
    );

    if (!videoFile) {
      throw new Error(`No video file generated in ${workDir}`);
    }

    const tmpVideoPath = join(workDir, videoFile);
    await moveFile(tmpVideoPath, outPath);

    console.log(`✅ [REPLAY] Video saved to: ${outPath}`);

    // Get actual video file size and duration
    const stats = await fs.stat(outPath);
    console.log(
      `📊 [REPLAY] Video size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`,
    );

    // Use ffprobe to get actual video duration if available
    let actualDuration = duration;
    try {
      const ffprobeResult = await new Promise<string>((resolve, reject) => {
        const proc = spawn("ffprobe", [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          outPath,
        ]);
        let output = "";
        proc.stdout.on("data", (data) => (output += data));
        proc.on("close", (code) => {
          if (code === 0) resolve(output.trim());
          else reject(new Error(`ffprobe exited with code ${code}`));
        });
        proc.on("error", reject);
      });
      actualDuration = parseFloat(ffprobeResult);
      console.log(
        `📊 [REPLAY] Actual video duration: ${actualDuration.toFixed(1)}s`,
      );
    } catch (err) {
      console.warn(`⚠️ [REPLAY] Could not get actual video duration:`, err);
    }

    const fileName = `${params.sessionId}.webm`;
    const bucketName = "ves.ai";
    const filePath = `${params.projectId}/${fileName}`;

    console.log(`  🗂️ Bucket: ${bucketName}`);
    console.log(`  📁 File path: ${filePath}`);
    console.log(`  📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // Initialize GCS client
    const storage = new Storage();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    // Create read stream from the local file
    const readStream = createReadStream(outPath);

    // Track upload progress
    let uploadedBytes = 0;
    let lastProgress = 0;

    readStream.on("data", (chunk) => {
      uploadedBytes += chunk.length;
      const progress = Math.round((uploadedBytes / stats.size) * 100);

      // Log progress every 10%
      if (progress >= lastProgress + 10) {
        console.log(
          `  📊 Upload progress: ${progress}% (${(uploadedBytes / 1024 / 1024).toFixed(1)} MB / ${(stats.size / 1024 / 1024).toFixed(1)} MB)`,
        );
        lastProgress = progress;
      }
    });

    // Create write stream to GCS
    const writeStream = file.createWriteStream({
      metadata: {
        contentType: "video/webm",
        cacheControl: "public, max-age=3600",
      },
      resumable: false, // Disable resumable uploads for Cloud Run (stateless)
      validation: false, // Disable validation for better performance
      gzip: false, // Don't gzip video files
    });

    // Stream the video to GCS
    try {
      await pipeline(readStream, writeStream);
      console.log(`  ✅ Upload completed successfully`);
      const videoUri = `gs://${bucketName}/${filePath}`;

      return {
        videoPath: outPath,
        videoDuration: actualDuration,
        videoUri,
      };
    } catch (error) {
      console.error(`  ❌ [UPLOAD ERROR] Failed to upload video:`, error);
      throw error;
    }
  } finally {
    await browser.close();
  }
}
