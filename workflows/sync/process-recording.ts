import adminSupabase from "@/lib/supabase/admin";
import { Json } from "@/schema";
import * as Sentry from "@sentry/nextjs";
import { FatalError, RetryableError } from "workflow";
import { GroupNames, GroupProperties, PostHogRecording } from "./types";

function parseRetryAfter(response: Response): number {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) return seconds;
  }
  return 60; // Default fallback
}

export async function processRecording({
  sourceId,
  recording,
  groupNames,
  groupProperties,
}: {
  sourceId: string;
  recording: PostHogRecording;
  groupNames: GroupNames;
  groupProperties: GroupProperties;
}): Promise<string> {
  "use step";

  const supabase = adminSupabase();

  // get source
  const { data: source } = await supabase
    .from("sources")
    .select("id, project_id, source_key, source_project")
    .eq("id", sourceId)
    .single();
  if (!source) throw new FatalError("Source not found");

  let groupId: string | null = null;
  let groupName: string | null = null;

  if (Object.keys(groupNames).length > 0) {
    // get the user's latest event (as it will contain group key)
    const personResponse = await fetch(
      `https://us.posthog.com/api/projects/${source.source_project}/query/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${source.source_key}`,
        },
        body: JSON.stringify({
          query: {
            kind: "HogQLQuery",
            query: `
                    SELECT $group_0
                    FROM events
                    WHERE person_id = '${recording.person?.uuid}'
                    ORDER BY timestamp DESC
                    LIMIT 1
                  `,
          },
        }),
      },
    );

    if (personResponse.status === 429) {
      const retryAfter = parseRetryAfter(personResponse);
      console.warn(
        `⏳ [PROCESS RECORDING] PostHog rate limited, retrying after ${retryAfter}`,
      );
      throw new RetryableError("PostHog rate limited", { retryAfter });
    }

    if (!personResponse.ok) {
      const errorText = await personResponse.text();
      console.error(
        `❌ [PROCESS RECORDING] PostHog API error: ${personResponse.status} - ${errorText}`,
      );
      throw new Error(`PostHog API error: ${personResponse.status}`);
    }

    const data = (await personResponse.json()) as {
      results: (number | string | null)[][];
    };
    console.log(`🔍 [PULL] Last event response:`, data);
    groupId =
      typeof data.results?.[0]?.[0] === "string"
        ? data.results?.[0]?.[0]
        : null;
    groupName = groupId ? groupNames[groupId] : null;
  }

  // upsert the project group to avoid duplicates
  let projectGroupId: string | null = null;
  if (groupId) {
    const { data: projectGroup, error: upsertProjectGroupError } =
      await supabase
        .from("project_groups")
        .upsert(
          {
            project_id: source.project_id,
            external_id: groupId,
            name: groupName,
            properties: groupProperties[groupId] || null,
            status: "pending",
          },
          {
            onConflict: "project_id,external_id",
            ignoreDuplicates: false,
          },
        )
        .select("id")
        .single();

    if (upsertProjectGroupError) {
      console.error(
        `❌ [PULL] Error upserting project group for recording ${recording.id}:`,
        upsertProjectGroupError,
      );
      Sentry.captureException(upsertProjectGroupError, {
        tags: { job: "syncSessions", step: "upsertProjectGroup" },
        extra: { externalId: recording.id, sourceId: source.id },
      });
    } else if (projectGroup) {
      projectGroupId = projectGroup.id;
    }
  }

  // upsert the project user to avoid duplicates
  let projectUserId: string | null = null;
  const { data: projectUser, error: upsertProjectUserError } = await supabase
    .from("project_users")
    .upsert(
      {
        project_id: source.project_id,
        external_id: recording.person!.uuid,
        name:
          recording.person?.name &&
          !recording.person.name.match(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          )
            ? recording.person.name
            : null,
        properties: recording.person?.properties as Json,
        project_group_id: projectGroupId,
        status: "pending",
      },
      {
        onConflict: "project_id,external_id",
        ignoreDuplicates: false,
      },
    )
    .select("id")
    .single();

  if (upsertProjectUserError) {
    console.error(
      `❌ [PULL] Error upserting project user for recording ${recording.id}:`,
      upsertProjectUserError,
    );
    Sentry.captureException(upsertProjectUserError, {
      tags: { job: "syncSessions", step: "upsertProjectUser" },
      extra: { externalId: recording.id, sourceId: source.id },
    });
    throw new Error("Error upserting project user");
  }

  projectUserId = projectUser.id;

  // check if session already exists
  const { data: existingSession } = await supabase
    .from("sessions")
    .select("id")
    .eq("project_id", source.project_id)
    .eq("external_id", recording.id)
    .single();
  if (existingSession) return existingSession.id;

  // upsert the session to avoid duplicates
  const { data: session } = await supabase
    .from("sessions")
    .upsert(
      {
        source_id: source.id,
        project_id: source.project_id,
        external_id: recording.id,
        project_user_id: projectUserId,
        project_group_id: projectGroupId,
        status: "pending",
        session_at: recording.end_time,
        total_duration: recording.recording_duration,
        active_duration: recording.active_seconds,
      },
      {
        onConflict: "project_id,external_id",
        ignoreDuplicates: false,
      },
    )
    .select("id")
    .single();

  if (!session) throw new Error("Error upserting session");
  return session.id;
}
