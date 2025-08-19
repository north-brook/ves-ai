import { Storage } from "@google-cloud/storage";
import fs from "node:fs";

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

  await storage.bucket(bucketName).upload(params.localPath, {
    destination: filePath,
    metadata: {
      contentType: "video/webm",
    },
  });

  console.log(`  ✅ Upload completed successfully`);

  return { url: `gs://${bucketName}/${filePath}` };
}
