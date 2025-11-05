import adminSupabase from "@/lib/supabase/admin";
import { FatalError } from "workflow";
import { PostHogRecording, PostHogRecordingsResponse } from "./types";

const ACTIVE_SECONDS_THRESHOLD = 5;
const MAX_PAGES = process.env.NODE_ENV === "development" ? 1 : Infinity;

export async function pullRecordings(
  sourceId: string,
): Promise<PostHogRecording[]> {
  "use step";

  console.log(`🔍 [PULL RECORDINGS] Pulling sessions for source: ${sourceId}`);

  const supabase = adminSupabase();

  // get source
  const { data: source } = await supabase
    .from("sources")
    .update({ last_active_at: new Date().toISOString() })
    .select(
      "id, project_id, source_key, source_project, source_host, project:projects(domain)",
    )
    .eq("id", sourceId)
    .single();
  if (!source) throw new FatalError("Source not found");

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
      `🕐 [PULL SESSIONS] Fetching recordings since ${sinceDate} (last session: ${latestSession.session_at})`,
    );
  } else {
    // If no sessions exist, get recordings from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sinceDate = sevenDaysAgo.toISOString();
    console.log(
      `🕐 [PULL SESSIONS] No existing sessions, fetching recordings from last 7 days (since ${sinceDate})`,
    );
  }

  const recordings: PostHogRecording[] = [];
  let totalNewSessionCount = 0;
  let totalSkippedCount = 0;
  let offset = 0;
  let pageNumber = 1;

  // Paginate through all recordings
  while (true) {
    console.log(
      `📄 [PULL SESSIONS] Fetching page ${pageNumber} from PostHog...`,
    );

    const response = await fetch(
      `${source.source_host}/api/projects/${source.source_project}/session_recordings?limit=100&date_from=${sinceDate}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${source.source_key}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ [SYNC SESSIONS] PostHog API error: ${response.status} - ${errorText}`,
      );
      throw new Error(`PostHog API error: ${response.status}`);
    }

    const data: PostHogRecordingsResponse = await response.json();

    // log data without the results
    const { results: _, ...rest } = data;
    console.log(`🔍 [SYNC SESSIONS] PostHog API response:`, rest);

    const pageRecordings: PostHogRecording[] = data.results || [];

    console.log(
      `📹 [SYNC SESSIONS] Page ${pageNumber}: Found ${pageRecordings.length} recordings`,
    );
    console.log(`   Has next page: ${data.has_next ? "yes" : "no"}`);

    for (const recording of pageRecordings) {
      // Skip ongoing recordings
      if (recording.ongoing) {
        continue;
      }

      // Filter by domain
      if (
        !recording.start_url ||
        !recording.start_url.includes(source.project.domain)
      )
        continue;

      // Filter by active seconds
      if (recording.active_seconds < ACTIVE_SECONDS_THRESHOLD) continue;

      // Filter by having a person
      if (!recording.person?.uuid) continue;

      // Check if session already exists
      const { data: existing } = await supabase
        .from("sessions")
        .select("id")
        .eq("project_id", source.project_id)
        .eq("external_id", recording.id)
        .single();

      if (existing) continue;

      recordings.push(recording);
    }

    // Move to next page
    offset += 100;
    pageNumber++;

    if (pageNumber > MAX_PAGES) {
      console.log(
        `🔍 [SYNC SESSIONS] Reached max pages, stopping pagination for source ${source.id}`,
      );
      break;
    }

    if (!data.has_next) {
      console.log(`🔍 [SYNC SESSIONS] No next page, stopping...`);
      break;
    }
  }

  console.log(
    `📊 [SYNC SESSIONS] Total summary: ${totalNewSessionCount} new, ${totalSkippedCount} skipped across ${pageNumber - 1} pages (filtered: domain=${source.project.domain}, active_seconds>=30)`,
  );

  return recordings;
}
