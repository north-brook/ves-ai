import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

export async function uploadToSupabase(params: {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  bucket: string;
  filePath: string;
  localPath: string; // webm local path
  signedUrlTtlSeconds?: number;
}): Promise<{ publicUrl: string }> {
  const supabase = createClient(
    params.supabaseUrl,
    params.supabaseServiceRoleKey,
  );

  const stream = fs.createReadStream(params.localPath);
  const { error: upErr } = await supabase.storage
    .from(params.bucket)
    .upload(params.filePath, stream, {
      contentType: "video/webm",
      upsert: true,
    });

  if (upErr) throw upErr;

  // Try permanent public URL first
  const { data: pub } = supabase.storage
    .from(params.bucket)
    .getPublicUrl(params.filePath);
  if (pub?.publicUrl) {
    return { publicUrl: pub.publicUrl };
  }

  // Fallback to a signed URL
  const expiresIn = params.signedUrlTtlSeconds ?? 7 * 24 * 3600; // default 7 days
  const { data: signed, error: signErr } = await supabase.storage
    .from(params.bucket)
    .createSignedUrl(params.filePath, expiresIn);
  if (signErr || !signed?.signedUrl) {
    throw new Error(
      `Uploaded but could not create URL: ${signErr?.message ?? "unknown"}`,
    );
  }
  return { publicUrl: signed.signedUrl };
}
