import adminSupabase from "@/lib/supabase/admin";
import { FatalError } from "workflow";
import * as Sentry from "@sentry/nextjs";

export async function since(sourceId: string): Promise<string> {
  "use step";

  console.log(`🕐 [SINCE] Calculating since date for source: ${sourceId}`);

  const supabase = adminSupabase();

  // get source and update status to syncing
  const { data: source, error: updateError } = await supabase
    .from("sources")
    .update({ last_active_at: new Date().toISOString(), status: "syncing" })
    .eq("id", sourceId)
    .select("id")
    .single();
  if (updateError) {
    console.error(
      `⚠️ [SINCE] Failed to update source last_active_at and status to syncing and get source:`,
      updateError,
    );
    Sentry.captureException(updateError, {
      tags: { job: "syncSessions", step: "since" },
      extra: { sourceId },
    });
    throw new FatalError(
      "Failed to update source last_active_at and status to syncing and get source",
    );
  }

  const { data: latestSession } = await supabase
    .from("sessions")
    .select("session_at, external_id")
    .eq("source_id", source.id)
    .not("session_at", "is", null)
    .order("session_at", { ascending: false })
    .limit(1)
    .single();

  let sinceDate: string;
  if (latestSession?.session_at) {
    // Use the latest session's end time as a filter
    // Subtract a small buffer (5 minutes) to catch any overlapping sessions
    const filterDate = new Date(latestSession.session_at);
    sinceDate = filterDate.toISOString();
    console.log(
      `🕐 [SINCE] Fetching recordings since ${sinceDate} (last session: ${latestSession.session_at})`,
    );
  } else {
    // If no sessions exist, get recordings from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sinceDate = sevenDaysAgo.toISOString();
    console.log(
      `🕐 [SINCE] No existing sessions, fetching recordings from last 7 days (since ${sinceDate})`,
    );
  }

  return sinceDate;
}
