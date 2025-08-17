import express from "express";
import { getRecordingMeta, enableSharingAndGetEmbedToken } from "./posthog";
import { recordReplayToWebm } from "./renderer";
import { uploadToSupabase } from "./uploader";
import { postCallback } from "./callback";
import type { RenderRequest } from "./types";
import { clampMs } from "./util";

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
    "recording_id",
    "supabase_url",
    "supabase_service_role_key",
    "supabase_bucket",
    "supabase_file_path",
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
    `[start] recording ${body.recording_id} | source=${body.source_type} | host=${body.source_host} | bucket=${body.supabase_bucket} | path=${body.supabase_file_path}`,
  );

  let successPayload: any | null = null;
  let errorPayload: any | null = null;

  try {
    // 1) Enable sharing & get embed URL
    const embedUrl = await enableSharingAndGetEmbedToken(
      body.source_host,
      body.source_key,
      body.source_project,
      body.recording_id,
    );

    // 2) Fetch meta to estimate runtime
    const meta = await getRecordingMeta(
      body.source_host,
      body.source_key,
      body.source_project,
      body.recording_id,
    );

    const expectedSeconds = Math.max(
      5,
      Math.floor(meta.active_seconds || meta.recording_duration || 60),
    );
    const expectedMs = clampMs(expectedSeconds * 1000);

    console.log(
      `[meta] expectedSeconds=${expectedSeconds} (active=${meta.active_seconds}, total=${meta.recording_duration}) -> wait≈${Math.round(expectedMs / 1000)}s`,
    );

    // 3) Record to WebM
    const { webmPath, durationSeconds } = await recordReplayToWebm(
      embedUrl,
      expectedSeconds,
    );

    console.log(
      `[rendered] duration=${durationSeconds.toFixed(1)}s webm=${webmPath}`,
    );

    // 4) Upload to Supabase
    const { publicUrl } = await uploadToSupabase({
      supabaseUrl: body.supabase_url,
      supabaseServiceRoleKey: body.supabase_service_role_key,
      bucket: body.supabase_bucket,
      filePath: body.supabase_file_path,
      localPath: webmPath,
      signedUrlTtlSeconds: body.signed_url_ttl_seconds,
    });

    console.log(`[uploaded] ${publicUrl}`);

    successPayload = {
      success: true,
      recording_id: body.recording_id,
      public_url: publicUrl,
      duration_seconds: Math.round(durationSeconds),
    };
    await postCallback(body.callback, successPayload);

    // Return the same success payload to the caller for convenience
    return res.status(200).json(successPayload);
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error(`[error] ${message}`);
    errorPayload = { success: false, error: message };
    await postCallback(body.callback, errorPayload);
    return res.status(500).json(errorPayload);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`listening on :${PORT}`);
  console.log(
    `Playwright will run headless Chromium. Ensure Cloud Run timeout >= 15m for long sessions.`,
  );
});
