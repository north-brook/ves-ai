import express from "express";
import fs from "fs/promises";
import { uploadToGCS } from "./uploader";
import { postCallback } from "./callback";
import type { ErrorPayload, ProcessRequest, SuccessPayload } from "./types";
import constructEvents from "./events";
import constructVideo from "./replay";
import constructContext from "./context";

const app = express();
app.use(express.json({ limit: "512kb" }));

// Track active recordings for cleanup
const activeRecordings = new Map<
  string,
  {
    body: ProcessRequest;
    callbackUrl: string;
    startTime: number;
  }
>();

app.get("/health", (_req, res) => res.status(200).send("ok"));

app.post("/process", async (req, res) => {
  const body = req.body as ProcessRequest;

  // Basic validation
  const missing = [
    "source_type",
    "source_host",
    "source_key",
    "source_project",
    "project_id",
    "session_id",
    "external_id",
    "active_duration",
    "callback",
  ].filter(
    (k) =>
      !(k in body) || (body as any)[k] === undefined || (body as any)[k] === "",
  );

  if (missing.length) {
    return res
      .status(400)
      .json({ success: false, error: `Missing fields: ${missing.join(", ")}` });
  }

  console.log(
    `🎬 [START] Recording ${body.external_id}\n` +
      `  📹 Source: ${body.source_type} | Host: ${body.source_host}\n` +
      `  🗂️ Target: ${body.project_id}/${body.session_id}`,
  );

  // Process the recording and hold connection open to ensure 1 recording per instance
  // The callback will be sent from processRecordingAsync
  try {
    await processRecordingAsync(body);
    // Only return 200 after processing is complete
    res.status(200).json({
      success: true,
      message: "Recording processed and callback sent",
      external_id: body.external_id,
    });
  } catch (err: any) {
    console.error(
      `❌ [ERROR] Failed to process recording ${body.external_id}:`,
      err,
    );
    // Return error but callback was already sent
    res.status(500).json({
      success: false,
      error: err.message || "Recording processing failed",
      external_id: body.external_id,
    });
  }
});

// Async function to process the recording
async function processRecordingAsync(body: ProcessRequest) {
  let successPayload: SuccessPayload | null = null;
  let errorPayload: ErrorPayload | null = null;
  const processStartTime = Date.now();

  // Fix callback URL for Docker containers to reach host
  let callbackUrl = body.callback;
  if (callbackUrl.includes("localhost") && process.env.DOCKERIZED === "true") {
    callbackUrl = callbackUrl.replace("localhost", "host.docker.internal");
    console.log(`🔄 [DOCKER] Rewriting callback URL to: ${callbackUrl}`);
  }

  // Track this recording as active
  activeRecordings.set(body.external_id, {
    body,
    callbackUrl,
    startTime: processStartTime,
  });

  // Set up process heartbeat
  const processHeartbeat = setInterval(() => {
    const elapsed = (Date.now() - processStartTime) / 1000;
    console.log(
      `⏰ [HEARTBEAT] Recording ${body.external_id} - ${elapsed.toFixed(0)}s elapsed`,
    );
  }, 30_000); // Log every 30 seconds

  try {
    // 1) Fetch and process events
    const { eventsPath, deviceWidth, deviceHeight } = await constructEvents({
      source_type: body.source_type,
      source_host: body.source_host,
      source_key: body.source_key,
      source_project: body.source_project,
      external_id: body.external_id,
    });

    // 2) In parallel: construct activity log and render video
    const [contextEvents, { videoPath, videoDuration }] = await Promise.all([
      constructContext({
        sessionId: body.session_id,
        eventsPath,
      }),
      constructVideo({
        eventsPath,
        config: {
          skipInactive: true,
          speed: 1,
          width: deviceWidth,
          height: deviceHeight,
          mouseTail: {
            strokeStyle: "green",
            lineWidth: 2,
          },
        },
      }),
    ]);

    // Check if the video is valid (not empty)
    const stats = await fs.stat(videoPath);
    const minSize = body.active_duration * 5000; // Minimum ~5KB per second

    if (stats.size < minSize) {
      console.error(
        `❌ [ERROR] Video seems empty or corrupted (${stats.size} bytes, expected minimum ${minSize} bytes)`,
      );
      throw new Error(
        `Video file is too small (${stats.size} bytes) - recording may have failed`,
      );
    }

    console.log(
      `✅ [RENDERED] Video created:\n` +
        `  ⏱️ Duration: ${videoDuration.toFixed(1)}s\n` +
        `  📁 Path: ${videoPath}`,
    );

    // 2) Upload to Google Cloud Storage
    const { uri } = await uploadToGCS({
      projectId: body.project_id,
      sessionId: body.session_id,
      localPath: videoPath,
    });

    console.log(`☁️ [UPLOADED] Successfully uploaded:\n` + `  🔗 URL: ${uri}`);

    // Clean up temporary video and events files
    try {
      await fs.unlink(videoPath);
      console.log(`🧹 [CLEANUP] Deleted temporary video file: ${videoPath}`);
    } catch (cleanupErr) {
      console.warn(`⚠️ [CLEANUP] Failed to delete temp file: ${cleanupErr}`);
    }

    try {
      await fs.unlink(eventsPath);
      console.log(`🧹 [CLEANUP] Deleted temporary events file: ${eventsPath}`);
    } catch (cleanupErr) {
      console.warn(`⚠️ [CLEANUP] Failed to delete events file: ${cleanupErr}`);
    }

    // Clear the heartbeat before sending success callback
    clearInterval(processHeartbeat);

    successPayload = {
      success: true,
      external_id: body.external_id,
      uri,
      video_duration: Math.round(videoDuration),
      events: contextEvents,
    };
    await postCallback(callbackUrl, successPayload);

    console.log(
      `✅ [COMPLETED] Recording ${body.external_id} processed successfully`,
    );
  } catch (err: any) {
    clearInterval(processHeartbeat);
    const message = err?.message || String(err);
    console.error(
      `❌ [ERROR] Recording failed:\n` +
        `  🆔 Recording: ${body.external_id}\n` +
        `  ⏱️ Duration: ${body.active_duration}s\n` +
        `  💥 Error: ${message}\n` +
        `  📚 Stack: ${err?.stack || "No stack trace"}`,
    );
    errorPayload = {
      success: false,
      error: message,
      external_id: body.external_id,
    };
    await postCallback(callbackUrl, errorPayload);
  } finally {
    clearInterval(processHeartbeat);
    activeRecordings.delete(body.external_id);
    const totalTime = (Date.now() - processStartTime) / 1000;
    console.log(
      `⏱️ [TIMING] Total processing time for ${body.external_id}: ${totalTime.toFixed(1)}s`,
    );
  }
}

// Track if we're already shutting down to prevent multiple shutdown attempts
let isShuttingDown = false;

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    console.log(`⚠️ [SHUTDOWN] Already shutting down, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  console.log(
    `\n⚠️ [SHUTDOWN] Received ${signal}, starting graceful shutdown...`,
  );

  // Close the server to stop accepting new connections
  if (server) {
    server.close(() => {
      console.log(`🚪 [SHUTDOWN] HTTP server closed`);
    });
  }

  // Send error callbacks for all active recordings
  const promises: Promise<void>[] = [];
  for (const [externalId, recording] of activeRecordings) {
    const elapsed = ((Date.now() - recording.startTime) / 1000).toFixed(1);
    console.log(
      `🔔 [SHUTDOWN] Sending error callback for recording ${externalId} (was running for ${elapsed}s)`,
    );

    const errorPayload: ErrorPayload = {
      success: false,
      error: `Service shutdown (${signal}) - recording interrupted after ${elapsed}s`,
      external_id: externalId,
    };

    promises.push(
      postCallback(recording.callbackUrl, errorPayload)
        .then(() => {
          console.log(`✅ [SHUTDOWN] Callback sent for ${externalId}`);
          activeRecordings.delete(externalId);
        })
        .catch((err) => {
          console.error(
            `❌ [SHUTDOWN] Failed to send callback for ${externalId}:`,
            err,
          );
        }),
    );
  }

  if (promises.length === 0) {
    console.log(`👍 [SHUTDOWN] No active recordings to clean up`);
  } else {
    // Wait for all callbacks to be sent (with timeout)
    await Promise.race([
      Promise.all(promises),
      new Promise((resolve) => setTimeout(resolve, 10000)), // 10 second timeout
    ]);
  }

  // Give a small delay to ensure HTTP responses are sent
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log(`👋 [SHUTDOWN] Graceful shutdown complete`);
  process.exit(0);
}

// Register signal handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGHUP", () => gracefulShutdown("SIGHUP"));

// Handle uncaught exceptions
process.on("uncaughtException", async (error) => {
  console.error("💥 [FATAL] Uncaught exception:", error);
  await gracefulShutdown("uncaughtException");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", async (reason, promise) => {
  console.error(
    "💥 [FATAL] Unhandled rejection at:",
    promise,
    "reason:",
    reason,
  );
  await gracefulShutdown("unhandledRejection");
});

const PORT = process.env.PORT || 8080;
let server: any; // Store server instance for graceful shutdown

server = app.listen(PORT, () => {
  console.log(
    `🚀 [SERVER] Cloud recording service started:\n` +
      `  🌐 Port: ${PORT}\n` +
      `  🎭 Playwright: Headless Chromium\n` +
      `  ⏰ Note: Ensure Cloud Run timeout >= 15m for long sessions`,
  );
});
