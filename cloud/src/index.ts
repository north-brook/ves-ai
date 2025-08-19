import express from "express";

import { recordReplayToWebm } from "./renderer";
import { uploadToGCS } from "./uploader";
import { postCallback } from "./callback";
import type { ErrorPayload, RenderRequest, SuccessPayload } from "./types";

const app = express();
app.use(express.json({ limit: "512kb" }));

app.get("/health", (_req, res) => res.status(200).send("ok"));

app.post("/render", async (req, res) => {
  const body = req.body as RenderRequest;

  // Basic validation
  const missing = [
    "source_type",
    "source_host",
    "source_key",
    "source_project",
    "project_id",
    "session_id",
    "recording_id",
    "active_duration",
    "embed_url",
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
    `🎬 [START] Recording ${body.recording_id}\n` +
      `  📹 Source: ${body.source_type} | Host: ${body.source_host}\n` +
      `  🗂️ Target: ${body.project_id}/${body.session_id}`,
  );

  // Return 200 immediately to acknowledge receipt
  res.status(200).json({
    success: true,
    message: "Recording job accepted and processing",
    recording_id: body.recording_id,
  });

  // Process the recording asynchronously
  processRecordingAsync(body).catch((err) => {
    console.error(
      `❌ [ASYNC ERROR] Failed to process recording ${body.recording_id}:`,
      err,
    );
  });
});

// Async function to process the recording
async function processRecordingAsync(body: RenderRequest) {
  let successPayload: SuccessPayload | null = null;
  let errorPayload: ErrorPayload | null = null;

  try {
    // 1) Use the embed URL provided in the request
    const embedUrl = body.embed_url;

    // 2) Record to WebM with retry logic for empty videos
    let videoPath: string = "";
    let durationSeconds: number = 0;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        const result = await recordReplayToWebm(embedUrl, body.active_duration);

        // Check if the video is valid (not empty)
        const fs = await import("fs/promises");
        const stats = await fs.stat(result.videoPath);
        const minSize = body.active_duration * 5000; // Minimum ~5KB per second

        if (stats.size < minSize && retryCount < maxRetries) {
          console.log(
            `⚠️ [RETRY] Video seems empty (${stats.size} bytes), retrying... (${retryCount + 1}/${maxRetries})`,
          );
          retryCount++;
          continue;
        }

        videoPath = result.videoPath;
        durationSeconds = result.durationSeconds;
        break;
      } catch (err) {
        if (retryCount < maxRetries) {
          console.log(
            `⚠️ [RETRY] Recording failed, retrying... (${retryCount + 1}/${maxRetries})`,
          );
          retryCount++;
        } else {
          throw err;
        }
      }
    }

    if (!videoPath) {
      throw new Error("Failed to create video after all retries");
    }

    console.log(
      `✅ [RENDERED] Video created:\n` +
        `  ⏱️ Duration: ${durationSeconds.toFixed(1)}s\n` +
        `  📁 Path: ${videoPath}`,
    );

    // 3) Upload to Google Cloud Storage
    const { url } = await uploadToGCS({
      projectId: body.project_id,
      sessionId: body.session_id,
      localPath: videoPath,
    });

    console.log(`☁️ [UPLOADED] Successfully uploaded:\n` + `  🔗 URL: ${url}`);

    successPayload = {
      success: true,
      recording_id: body.recording_id,
      url,
      video_duration: Math.round(durationSeconds),
    };
    await postCallback(body.callback, successPayload);

    console.log(
      `✅ [COMPLETED] Recording ${body.recording_id} processed successfully`,
    );
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error(
      `❌ [ERROR] Recording failed:\n` +
        `  🆔 Recording: ${body.recording_id}\n` +
        `  💥 Error: ${message}\n` +
        `  📚 Stack: ${err?.stack || "No stack trace"}`,
    );
    errorPayload = {
      success: false,
      error: message,
      recording_id: body.recording_id,
    };
    await postCallback(body.callback, errorPayload);
  }
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(
    `🚀 [SERVER] Cloud recording service started:\n` +
      `  🌐 Port: ${PORT}\n` +
      `  🎭 Playwright: Headless Chromium\n` +
      `  ⏰ Note: Ensure Cloud Run timeout >= 15m for long sessions`,
  );
});
