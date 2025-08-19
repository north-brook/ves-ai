import { Storage } from "@google-cloud/storage";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";

export async function uploadToGCS(params: {
  projectId: string;
  sessionId: string;
  localPath: string;
}): Promise<{ url: string }> {
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

  // Use streaming upload instead of loading entire file into memory
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);

  // Create a read stream from the local file
  const readStream = fs.createReadStream(params.localPath);
  
  // Create a write stream to GCS
  const writeStream = file.createWriteStream({
    metadata: {
      contentType: "video/webm",
    },
    resumable: false, // Disable resumable uploads for smaller memory footprint
  });

  // Stream the file to GCS
  await pipeline(readStream, writeStream);

  console.log(`  ✅ Upload completed successfully`);

  return { url: `gs://${bucketName}/${filePath}` };
}
