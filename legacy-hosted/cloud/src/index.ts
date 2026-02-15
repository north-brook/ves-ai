import express from "express";
import fs from "fs/promises";
import { postCallback } from "./callback";
import constructEvents from "./events";
import constructVideo from "./replay";
import type { ProcessReplayRequest, ReplayError, ReplaySuccess } from "./types";

const app = express();
app.use(express.json({ limit: "512kb" }));

const activeRecordings = new Map<
  string,
  { body: ProcessReplayRequest; callbackUrl?: string | null; startTime: number }
>();

app.get("/health", (_req, res) => res.status(200).send("ok"));

app.post("/process", async (req, res) => {
  const body = req.body as ProcessReplayRequest;

  const missing = [
    "source_type",
    "source_host",
    "source_key",
    "source_project",
    "project_id",
    "session_id",
    "external_id",
    "active_duration",
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
    `🎬 [RECEIVED] Recording ${body.external_id}\n` +
      `  📹 Source: ${body.source_type} | Host: ${body.source_host}\n` +
      `  🗂️ Target: ${body.project_id}/${body.session_id}`,
  );

  // Process synchronously and keep HTTP request open
  // This maintains request-based billing autoscaling (1 request = 1 session)
  try {
    const { response } = await processRecordingAsync(body);
    res.status(200).json({
      success: true,
      message: "Recording processed and finished callback sent",
      response,
      external_id: body.external_id,
    });
  } catch (err: any) {
    console.error(
      `❌ [ERROR] Failed to process recording ${body.external_id}:`,
      err,
    );
    res.status(500).json({
      success: false,
      error: err.message || "Recording processing failed",
      external_id: body.external_id,
    });
  }
});

async function processRecordingAsync(
  body: ProcessReplayRequest,
): Promise<{ response: ReplaySuccess | ReplayError | null }> {
  let ReplaySuccess: ReplaySuccess | null = null;
  let ReplayError: ReplayError | null = null;
  const processStartTime = Date.now();

  let callbackUrl = body.callback;
  if (callbackUrl?.includes("localhost") && process.env.DOCKERIZED === "true") {
    callbackUrl = callbackUrl.replace("localhost", "host.docker.internal");
    console.log(`🔄 [DOCKER] Rewriting callback URL to: ${callbackUrl}`);
  }

  activeRecordings.set(body.external_id, {
    body,
    callbackUrl,
    startTime: processStartTime,
  });

  const processHeartbeat = setInterval(() => {
    const elapsed = (Date.now() - processStartTime) / 1000;
    console.log(
      `⏰ [HEARTBEAT] Recording ${body.external_id} - ${elapsed.toFixed(0)}s elapsed`,
    );
  }, 30_000);

  try {
    const { eventsPath, deviceWidth, deviceHeight, eventsUri } =
      await constructEvents({
        source_type: body.source_type,
        source_host: body.source_host,
        source_key: body.source_key,
        source_project: body.source_project,
        external_id: body.external_id,
        project_id: body.project_id,
        session_id: body.session_id,
      });

    const { videoPath, videoDuration, videoUri } = await constructVideo({
      projectId: body.project_id,
      sessionId: body.session_id,
      eventsPath,
      config: {
        skipInactive: true,
        speed: 1,
        width: Math.max(320, deviceWidth),
        height: Math.max(240, deviceHeight),
        mouseTail: { strokeStyle: "red", lineWidth: 2, lineCap: "round" },
      },
    });

    console.log(
      `✅ [RENDERED] Video created and uploaded:\n` +
        `  ⏱️ Duration: ${videoDuration.toFixed(1)}s\n` +
        `  📁 Local Path: ${videoPath}\n` +
        `  ☁️ GCS URI: ${videoUri}`,
    );

    try {
      await fs.unlink(videoPath);
      console.log(`🧹 [CLEANUP] Deleted temporary video file: ${videoPath}`);
    } catch (cleanupErr) {
      console.warn(`⚠️ [CLEANUP] Failed to delete temp video: ${cleanupErr}`);
    }

    try {
      await fs.unlink(eventsPath);
      console.log(`🧹 [CLEANUP] Deleted temporary events file: ${eventsPath}`);
    } catch (cleanupErr) {
      console.warn(`⚠️ [CLEANUP] Failed to delete events file: ${cleanupErr}`);
    }

    clearInterval(processHeartbeat);

    ReplaySuccess = {
      success: true,
      external_id: body.external_id,
      video_uri: videoUri,
      video_duration: Math.round(videoDuration),
      events_uri: eventsUri,
    };
    if (callbackUrl) await postCallback(callbackUrl, ReplaySuccess);

    console.log(
      `✅ [COMPLETED] Recording ${body.external_id} processed successfully`,
    );

    return { response: ReplaySuccess };
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
    ReplayError = {
      success: false,
      error: message,
      external_id: body.external_id,
    };
    if (callbackUrl) await postCallback(callbackUrl, ReplayError);
    return { response: ReplayError };
  } finally {
    clearInterval(processHeartbeat);
    activeRecordings.delete(body.external_id);
    const totalTime = (Date.now() - processStartTime) / 1000;
    console.log(
      `⏱️ [TIMING] Total processing time for ${body.external_id}: ${totalTime.toFixed(1)}s`,
    );
  }
}

// Graceful shutdown
let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    console.log(`⚠️ [SHUTDOWN] Already shutting down, ignoring ${signal}`);
    return;
  }
  isShuttingDown = true;
  console.log(
    `\n⚠️ [SHUTDOWN] Received ${signal}, starting graceful shutdown...`,
  );
  if (server) {
    server.close(() => console.log(`🚪 [SHUTDOWN] HTTP server closed`));
  }
  const promises: Promise<void>[] = [];
  for (const [externalId, recording] of activeRecordings) {
    const elapsed = ((Date.now() - recording.startTime) / 1000).toFixed(1);
    console.log(
      `🔔 [SHUTDOWN] Sending error callback for recording ${externalId} (${elapsed}s)`,
    );
    const ReplayError: ReplayError = {
      success: false,
      error: `Service shutdown (${signal}) - recording interrupted after ${elapsed}s`,
      external_id: externalId,
    };
    if (recording.callbackUrl)
      promises.push(
        postCallback(recording.callbackUrl, ReplayError)
          .then(() => {
            console.log(`✅ [SHUTDOWN] Callback sent for ${externalId}`);
            activeRecordings.delete(externalId);
          })
          .catch((err) =>
            console.error(
              `❌ [SHUTDOWN] Failed callback for ${externalId}:`,
              err,
            ),
          ),
      );
  }
  if (promises.length) {
    await Promise.race([
      Promise.all(promises),
      new Promise((r) => setTimeout(r, 10_000)),
    ]);
  } else {
    console.log(`👍 [SHUTDOWN] No active recordings to clean up`);
  }
  await new Promise((r) => setTimeout(r, 1000));
  console.log(`👋 [SHUTDOWN] Graceful shutdown complete`);
  process.exit(0);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGHUP", () => gracefulShutdown("SIGHUP"));
process.on("uncaughtException", async (error) => {
  console.error("💥 [FATAL] Uncaught exception:", error);
  await gracefulShutdown("uncaughtException");
});
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
let server: any;
server = app.listen(PORT, () => {
  console.log(
    `🚀 [SERVER] Cloud recording service started:\n` +
      `  🌐 Port: ${PORT}\n` +
      `  🎭 Playwright: Headless Chromium\n` +
      `  ⏰ Note: Ensure Cloud Run timeout >= 15m for long sessions`,
  );
});
