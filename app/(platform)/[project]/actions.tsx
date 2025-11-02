"use server";

import storage from "@/lib/storage";
import serverSupabase from "@/lib/supabase/server";

export async function syncSessions(projectSlug: string) {
  try {
    const supabase = await serverSupabase();

    // Get project ID from slug
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", projectSlug)
      .single();

    if (!project) {
      console.error(`❌ [SERVER ACTION] Project not found: ${projectSlug}`);
      return { success: false, error: "Project not found" };
    }

    console.log(
      `🚀 [SERVER ACTION] Triggering sync sessions job for project ${project.id}`,
    );

    // Construct the job URL
    const jobUrl = `${process.env.NEXT_PUBLIC_URL}/api/sync?project_id=${project.id}`;

    console.log(`🔗 [SERVER ACTION] Fetching: ${jobUrl}`);

    const response = await fetch(jobUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`❌ [SERVER ACTION] Failed to trigger sync sessions job:`, {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
        url: jobUrl,
      });
      return {
        success: false,
        error: `Failed to trigger job: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log(
      `✅ [SERVER ACTION] Successfully triggered sync sessions job for project ${project.id}`,
    );

    return { success: true, data };
  } catch (error) {
    console.error(
      `❌ [SERVER ACTION] Error triggering sync sessions job:`,
      error,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

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
