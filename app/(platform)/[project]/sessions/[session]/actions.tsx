"use server";

import storage from "@/lib/storage";
import serverSupabase from "@/lib/supabase/server";
import { Storage } from "@google-cloud/storage";

export async function getVideoUrl(
  sessionId: string,
): Promise<{ url: string } | { error: string }> {
  const supabase = await serverSupabase();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("video_uri")
    .eq("id", sessionId)
    .single();

  if (sessionError) return { error: sessionError.message };
  if (!session.video_uri) return { error: "Video URI not found" };

  const parts = session.video_uri.replace("gs://", "").split("/");
  const bucketName = parts[0];
  const objectName = parts.slice(1).join("/");

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(objectName);

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 1, // 1 day
  });

  return { url };
}
