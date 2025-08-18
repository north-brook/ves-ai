import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import * as tus from "tus-js-client";

export async function uploadToSupabase(params: {
  supabaseUrl: string;
  supabaseStorageUrl: string;
  supabaseServiceRoleKey: string;
  bucket: string;
  filePath: string;
  localPath: string; // webm local path
  signedUrlTtlSeconds?: number;
}): Promise<{ publicUrl: string }> {
  console.log("🚚 [UPLOAD] Starting upload to Supabase...");
  console.log(`  🗂️ Bucket: ${params.bucket}`);
  console.log(`  📁 File path: ${params.filePath}`);

  const supabase = createClient(
    params.supabaseUrl,
    params.supabaseServiceRoleKey,
  );

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

  // Read file as Buffer
  const fileBuffer = fs.readFileSync(params.localPath);

  // Determine if we're running locally based on storage URL
  const isLocal = params.supabaseStorageUrl.includes("http://127.0.0.1");

  // For local dev, use direct upload. For production, use TUS resumable upload
  if (isLocal) {
    console.log(`  📤 Using direct upload (local environment)...`);

    // Convert Buffer to Blob for local environment
    const blob = new Blob([fileBuffer], { type: "video/webm" });
    
    // Use Supabase SDK's standard upload method with Blob
    const { error } = await supabase.storage
      .from(params.bucket)
      .upload(params.filePath, blob, {
        contentType: "video/webm",
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error(`  ❌ [ERROR] Upload failed: ${error.message}`);
      console.error(`  📝 Error details:`, error);
      throw error;
    }

    console.log(`  ✅ Upload successful`);
  } else {
    // Use TUS for production
    console.log(`  📤 Starting resumable upload (production)...`);

    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(fileBuffer, {
        endpoint: `${params.supabaseStorageUrl}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${params.supabaseServiceRoleKey}`,
          "x-upsert": "true", // Overwrite existing files
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true, // Allow re-uploading the same file
        metadata: {
          bucketName: params.bucket,
          objectName: params.filePath,
          contentType: "video/webm",
          cacheControl: "3600",
        },
        chunkSize: 6 * 1024 * 1024, // Must be 6MB for Supabase
        onError: function (error) {
          console.error(
            `  ❌ [ERROR] Upload failed: ${error.message || error}`,
          );
          reject(error);
        },
        onProgress: function (bytesUploaded, bytesTotal) {
          const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(1);
          const uploadedMB = (bytesUploaded / 1024 / 1024).toFixed(1);
          const totalMB = (bytesTotal / 1024 / 1024).toFixed(1);
          process.stdout.write(
            `\r  📊 Progress: ${uploadedMB}/${totalMB} MB (${percentage}%)`,
          );
        },
        onSuccess: function () {
          console.log(`\n  ✅ Upload successful`);
          resolve();
        },
      });

      // Check for previous uploads to resume
      upload
        .findPreviousUploads()
        .then((previousUploads) => {
          if (previousUploads.length) {
            console.log(`  🔄 Found previous upload, resuming...`);
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          // Start the upload
          upload.start();
        })
        .catch((err) => {
          console.error(
            `  ❌ [ERROR] Failed to check for previous uploads: ${err.message || err}`,
          );
          reject(err);
        });
    });

    console.log(`  ✅ Upload completed successfully`);
  }

  // Try permanent public URL first
  console.log(`  🔗 Generating public URL...`);
  const { data: pub } = supabase.storage
    .from(params.bucket)
    .getPublicUrl(params.filePath);
  if (pub?.publicUrl) {
    console.log(`  ✅ Public URL generated successfully`);
    return { publicUrl: pub.publicUrl };
  }

  // Fallback to a signed URL
  console.log(`  🔐 Falling back to signed URL...`);
  const expiresIn = params.signedUrlTtlSeconds ?? 7 * 24 * 3600; // default 7 days
  const { data: signed, error: signErr } = await supabase.storage
    .from(params.bucket)
    .createSignedUrl(params.filePath, expiresIn);
  if (signErr || !signed?.signedUrl) {
    console.error(
      `  ❌ [ERROR] Failed to create signed URL: ${signErr?.message ?? "unknown"}`,
    );
    throw new Error(
      `Uploaded but could not create URL: ${signErr?.message ?? "unknown"}`,
    );
  }
  console.log(`  ✅ Signed URL created (expires in ${expiresIn}s)`);
  return { publicUrl: signed.signedUrl };
}
