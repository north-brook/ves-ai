import adminSupabase from "@/lib/supabase/admin";
import { FatalError } from "workflow";
import { PostHogRecording, PostHogRecordingsResponse } from "./types";

const ACTIVE_SECONDS_THRESHOLD = 5;

export async function pullRecordings(
  sourceId: string,
  sinceDate: string,
  offset: number = 0,
): Promise<{
  recordings: PostHogRecording[];
  hasNext: boolean;
  nextOffset: number;
}> {
  "use step";

  console.log(
    `🔍 [PULL RECORDINGS] Pulling sessions for source: ${sourceId}, offset: ${offset}`,
  );

  const supabase = adminSupabase();

  // get source
  const { data: source } = await supabase
    .from("sources")
    .select(
      "id, project_id, source_key, source_project, source_host, project:projects(domain)",
    )
    .eq("id", sourceId)
    .single();
  if (!source) throw new FatalError("Source not found");

  console.log(`📄 [PULL RECORDINGS] Fetching from PostHog...`);

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
      `❌ [PULL RECORDINGS] PostHog API error: ${response.status} - ${errorText}`,
    );
    throw new Error(`PostHog API error: ${response.status}`);
  }

  const data: PostHogRecordingsResponse = await response.json();

  // log data without the results
  const { results: _, ...rest } = data;
  console.log(`🔍 [PULL RECORDINGS] PostHog API response:`, rest);

  const pageRecordings: PostHogRecording[] = data.results || [];

  console.log(
    `📹 [PULL RECORDINGS] Found ${pageRecordings.length} recordings`,
  );
  console.log(`   Has next page: ${data.has_next ? "yes" : "no"}`);

  const recordings: PostHogRecording[] = [];

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

  console.log(
    `📊 [PULL RECORDINGS] Filtered to ${recordings.length} new recordings (filtered: domain=${source.project.domain}, active_seconds>=${ACTIVE_SECONDS_THRESHOLD})`,
  );

  return {
    recordings,
    hasNext: data.has_next ?? false,
    nextOffset: offset + 100,
  };
}
