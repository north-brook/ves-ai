import { Storage } from "@google-cloud/storage";
import fs from "node:fs";
import stream from "node:stream";

export async function uploadToGCS(params: {
  projectId: string;
  sessionId: string;
  localPath: string;
}): Promise<{ uri: string }> {
  const fileName = `${params.sessionId}.webm`;
  const bucketName = "ves.ai";
  const filePath = `${params.projectId}/${fileName}`;

  console.log("🚚 [UPLOAD] Starting upload to Google Cloud Storage...");
  console.log(`  🗂️ Bucket: ${bucketName}`);
  console.log(`  📁 File path: ${filePath}`);

  // Check file size before upload
  const stats = fs.statSync(params.localPath);
  const fileSizeMB = stats.size / 1024 / 1024;
  console.log(`  📊 Local file size: ${fileSizeMB.toFixed(2)} MB`);

  if (stats.size < 1000) {
    console.error(
      `  ❌ [ERROR] File too small to be valid video: ${stats.size} bytes`,
    );
    throw new Error(
      `Video file is empty or corrupted (size: ${stats.size} bytes)`,
    );
  }

  console.log(`  📤 Starting upload...`);

  // Initialize GCS client
  const storage = new Storage();

  // Get a reference to the bucket and file
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);

  // Create a PassThrough stream for better control
  const passthroughStream = new stream.PassThrough();

  // Create read stream from the local file
  const readStream = fs.createReadStream(params.localPath);

  // Set up progress tracking
  let uploadedBytes = 0;
  let lastProgress = 0;

  passthroughStream.on("data", (chunk) => {
    uploadedBytes += chunk.length;
    const progress = Math.round((uploadedBytes / stats.size) * 100);

    // Log progress every 10%
    if (progress >= lastProgress + 10) {
      console.log(
        `  📊 Upload progress: ${progress}% (${(uploadedBytes / 1024 / 1024).toFixed(1)} MB / ${fileSizeMB.toFixed(1)} MB)`,
      );
      lastProgress = progress;
    }
  });

  // Create the upload promise
  const uploadPromise = new Promise<void>((resolve, reject) => {
    // Create write stream to GCS with options
    const writeStream = file.createWriteStream({
      metadata: {
        contentType: "video/webm",
        cacheControl: "public, max-age=3600",
      },
      resumable: false, // Disable resumable uploads for Cloud Run (stateless)
      validation: false, // Disable validation for better performance
      gzip: false, // Don't gzip video files
    });

    // Handle write stream events
    writeStream.on("error", (err) => {
      console.error(`  ❌ [UPLOAD ERROR] ${err.message}`);
      reject(err);
    });

    writeStream.on("finish", () => {
      console.log(`  ✅ Upload completed successfully`);
      resolve();
    });

    // Pipe the passthrough stream to GCS write stream
    passthroughStream.pipe(writeStream);
  });

  // Handle read stream errors
  readStream.on("error", (err) => {
    console.error(`  ❌ [READ ERROR] Failed to read file: ${err.message}`);
    passthroughStream.destroy(err);
  });

  // Pipe the file through the passthrough stream
  readStream.pipe(passthroughStream);

  // Wait for upload to complete
  await uploadPromise;

  return {
    uri: `gs://${bucketName}/${filePath}`,
  };
}
