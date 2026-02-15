import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";

export async function finish(sourceId: string) {
  "use step";

  const supabase = adminSupabase();

  // update source last_active_at and status to synced
  const { error: updateError } = await supabase
    .from("sources")
    .update({ last_active_at: new Date().toISOString(), status: "synced" })
    .eq("id", sourceId);

  if (updateError) {
    console.error(
      `⚠️ [FINISH] Failed to update source last_active_at and status to synced:`,
      updateError,
    );
    Sentry.captureException(updateError, {
      tags: { job: "syncSessions", step: "finish" },
      extra: { sourceId },
    });
  }

  console.log(
    `🕐 [FINISH] Source ${sourceId} finished syncing at`,
    new Date().toISOString(),
  );
}
