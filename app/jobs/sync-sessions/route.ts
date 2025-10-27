import { NextRequest, NextResponse } from "next/server";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import { Database } from "@/types";
import nextJobs from "./next-job";
import { Json } from "@/schema";

type Source = Database["public"]["Tables"]["sources"]["Row"] & {
  projects: {
    id: string;
    name: string;
    domain: string;
    slug: string;
  };
};

type PostHogRecording = {
  id: string;
  distinct_id: string;
  viewed: boolean;
  recording_duration: number;
  active_seconds: number;
  inactive_seconds: number;
  start_time: string;
  end_time: string;
  click_count: number;
  keypress_count: number;
  mouse_activity_count: number;
  console_log_count: number;
  console_warn_count: number;
  console_error_count: number;
  start_url: string;
  person: {
    id: string;
    name: string;
    distinct_ids: string[];
    properties: Record<string, unknown> | null;
    created_at: string;
    uuid: string;
  } | null;
  storage: string;
  snapshot_source: string;
  ongoing: boolean;
  activity_score: number;
};

type PostHogRecordingsResponse = {
  results: PostHogRecording[];
  has_next: boolean;
};

const ACTIVE_SECONDS_THRESHOLD = 5;

export async function GET(request: NextRequest) {
  const jobStartTime = Date.now();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  try {
    // Verify CRON_SECRET for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("🚫 Unauthorized cron job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (projectId) {
      console.log(
        `🎯 [SYNC SESSIONS] Starting job run for specific project: ${projectId} at`,
        new Date().toISOString(),
      );
    } else {
      console.log(
        "🚀 [SYNC SESSIONS] Starting job run for all projects at",
        new Date().toISOString(),
      );
    }

    const supabase = adminSupabase();

    // Step 1: Pull session replays from sources
    console.log(
      `📥 [SYNC SESSIONS] Fetching PostHog sources${projectId ? ` for project ${projectId}` : ""}...`,
    );

    let sourcesQuery = supabase
      .from("sources")
      .select("*, projects!inner(id, name, domain, slug)")
      .eq("type", "posthog");

    // Filter by project if specified
    if (projectId) {
      sourcesQuery = sourcesQuery.eq("project_id", projectId);
    }

    const { data: sources, error: sourcesError } = await sourcesQuery;

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`);
    }

    console.log(
      `✅ [SYNC SESSIONS] Found ${sources?.length || 0} PostHog sources${projectId ? ` for project ${projectId}` : ""}`,
    );

    // Group sources by project for parallel project processing
    const sourcesByProject = new Map<string, Source[]>();
    for (const source of sources || []) {
      const projectId = source.project_id;
      if (!sourcesByProject.has(projectId)) {
        sourcesByProject.set(projectId, []);
      }
      sourcesByProject.get(projectId)!.push(source as Source);
    }

    console.log(
      `📊 [SYNC SESSIONS] Processing ${sourcesByProject.size} projects in parallel`,
    );

    // Process all projects in parallel
    const projectResults = await Promise.all(
      Array.from(sourcesByProject.entries()).map(
        async ([projectId, projectSources]) => {
          const projectName = projectSources[0].projects.name;
          console.log(
            `🚀 [SYNC SESSIONS] Starting processing for project ${projectId} (${projectName})`,
          );

          let totalNewSessions = 0;
          let totalProcessed = 0;

          // Step 1: Pull new sessions from all sources for this project
          for (const source of projectSources) {
            try {
              console.log(
                `🔄 [SYNC SESSIONS] Pulling sessions from source ${source.id} (Project: ${projectName})...`,
              );

              // Pull sessions only (don't process yet)
              const newSessionIds = await pullSessionsFromSource(
                source,
                supabase,
              );

              totalNewSessions += newSessionIds.length;

              console.log(
                `✅ [SYNC SESSIONS] Pulled ${newSessionIds.length} new sessions from source ${source.id}`,
              );
            } catch (error) {
              console.error(
                `❌ [SYNC SESSIONS] Error pulling from source ${source.id}:`,
                error,
              );
              Sentry.captureException(error, {
                tags: { job: "syncSessions", step: "pullSessions" },
                extra: { sourceId: source.id, projectId },
              });
            }
          }

          // Step 2: Process all pending sessions for this project (both new and existing)
          console.log(
            `⚙️ [SYNC SESSIONS] Processing pending sessions for project ${projectName}...`,
          );

          const processedCount = await nextJobs(projectId, 20);

          totalProcessed = processedCount;

          console.log(
            `✅ [SYNC SESSIONS] Processed ${processedCount} pending sessions for project ${projectName}`,
          );

          return {
            projectId,
            projectName,
            newSessions: totalNewSessions,
            processed: totalProcessed,
          };
        },
      ),
    );

    // Aggregate results
    const pullResults = projectResults.reduce(
      (sum, r) => sum + r.newSessions,
      0,
    );
    const processResults = {
      triggered: projectResults.reduce((sum, r) => sum + r.processed, 0),
      total: projectResults.reduce((sum, r) => sum + r.processed, 0),
    };

    console.log(`✅ [CRON] All projects processed successfully`);
    for (const result of projectResults) {
      console.log(
        `   Project ${result.projectName}: ${result.newSessions} new sessions`,
      );
    }

    // Remove revalidatePath - using realtime channels now

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      projectId: projectId || "all",
      stats: {
        sources: sources?.length || 0,
        newSessions: pullResults,
        pendingProcessed: processResults.triggered,
        projectsProcessed: projectResults.length,
      },
    };

    // Beautiful completion log
    const duration = ((Date.now() - jobStartTime) / 1000).toFixed(2);
    console.log(`✨ CRON JOB COMPLETED SUCCESSFULLY ✨`);
    console.log(`${"=".repeat(60)}`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(
      `🎯 Scope: ${projectId ? `Project ${projectId}` : "All Projects"}`,
    );
    console.log(`\n📊 STATISTICS:`);
    console.log(`  🏢 Projects Processed: ${summary.stats.projectsProcessed}`);
    console.log(`  🔌 Sources Checked: ${summary.stats.sources}`);
    console.log(`  🆕 New Sessions: ${summary.stats.newSessions}`);
    console.log(`  ⚙️  Sessions Triggered: ${summary.stats.pendingProcessed}`);

    if (projectResults.length > 0) {
      console.log(`\n📈 PROJECT BREAKDOWN:`);
      for (const result of projectResults) {
        const emoji = result.newSessions > 0 ? "🟢" : "⚪";
        console.log(
          `  ${emoji} ${result.projectName}: ${result.newSessions} new sessions`,
        );
      }
    }

    console.log(`\n💚 Health Status: All systems operational`);
    return NextResponse.json(summary);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    const duration = ((Date.now() - jobStartTime) / 1000).toFixed(2);

    console.log(`💥 CRON JOB FAILED 💥`);
    console.log(`${"=".repeat(60)}`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(
      `🎯 Scope: ${projectId ? `Project ${projectId}` : "All Projects"}`,
    );
    console.log(`\n❌ ERROR DETAILS:`);
    console.log(`  Message: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.log(`  Stack trace:`);
      error.stack
        .split("\n")
        .slice(1, 4)
        .forEach((line) => {
          console.log(`    ${line.trim()}`);
        });
    }
    console.log(`\n🔴 Health Status: Service experiencing issues`);

    Sentry.captureException(error, {
      tags: { job: "cron" },
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function pullSessionsFromSource(
  source: Source,
  supabase: ReturnType<typeof adminSupabase>,
): Promise<string[]> {
  console.log(
    `🔍 [SYNC SESSIONS] Fetching recordings from PostHog for source ${source.id}`,
  );
  console.log(
    `📍 [SYNC SESSIONS] Host: ${source.source_host}, Project: ${source.source_project}`,
  );
  console.log(
    `🌐 [SYNC SESSIONS] Will filter recordings for domain: ${source.projects.domain} and active_seconds >= 30`,
  );

  if (!source.source_host || !source.source_key || !source.source_project) {
    console.error(
      `⚠️ [SYNC SESSIONS] Source ${source.id} missing required fields`,
    );
    return [];
  }

  const groupNames: Record<string, string> = {};
  const groupProperties: Record<string, Json> = {};
  let query: string | null =
    `https://us.posthog.com/api/projects/${source.source_project}/groups/?group_type_index=0`;

  while (true) {
    // get posthog groups
    const groupResponse = await fetch(query, {
      headers: {
        Authorization: `Bearer ${source.source_key}`,
        "Content-Type": "application/json",
      },
    });

    const groupData = (await groupResponse.json()) as {
      next: string | null;
      previous: string | null;
      results: {
        group_type_index: number;
        group_key: string;
        group_properties: Record<string, unknown>;
        group_created_at: string;
      }[];
    };

    for (const group of groupData.results) {
      groupNames[group.group_key] = group.group_properties.name as string;
      groupProperties[group.group_key] = group.group_properties as Json;
    }

    if (groupData.next) {
      query = groupData.next;
    } else {
      break;
    }
  }

  console.log(`🔍 [PULL] Groups: ${Object.keys(groupNames).length}`);

  // Get the most recent session we've pulled from this source
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
    filterDate.setMinutes(filterDate.getMinutes() - 5);
    sinceDate = filterDate.toISOString();
    console.log(
      `🕐 [PULL SESSIONS] Fetching recordings since ${sinceDate} (last session: ${latestSession.session_at})`,
    );
  } else {
    // If no sessions exist, get recordings from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    sinceDate = thirtyDaysAgo.toISOString();
    console.log(
      `🕐 [PULL SESSIONS] No existing sessions, fetching recordings from last 30 days (since ${sinceDate})`,
    );
  }

  const createdSessionIds: string[] = [];
  let totalNewSessionCount = 0;
  let totalSkippedCount = 0;
  let offset = 0;
  let pageNumber = 1;
  const DEBUG_MAX_PAGES = 1;

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

    const recordings: PostHogRecording[] = data.results || [];

    console.log(
      `📹 [SYNC SESSIONS] Page ${pageNumber}: Found ${recordings.length} recordings`,
    );
    console.log(`   Has next page: ${data.has_next ? "yes" : "no"}`);

    // Process recordings on this page
    let pageNewCount = 0;
    let pageSkippedCount = 0;
    let domainFilteredCount = 0;
    let activeSecondsFilteredCount = 0;

    // Collect recordings that need new sessions
    const recordingsToProcess: PostHogRecording[] = [];

    for (const recording of recordings) {
      // Skip ongoing recordings
      if (recording.ongoing) {
        pageSkippedCount++;
        continue;
      }

      // Filter by domain
      if (
        !recording.start_url ||
        !recording.start_url.includes(source.projects.domain)
      ) {
        domainFilteredCount++;
        continue;
      }

      // Filter by active seconds
      if (recording.active_seconds < ACTIVE_SECONDS_THRESHOLD) {
        activeSecondsFilteredCount++;
        continue;
      }

      // Check if session already exists
      const { data: existing } = await supabase
        .from("sessions")
        .select("id")
        .eq("source_id", source.id)
        .eq("external_id", recording.id)
        .single();

      if (!existing) {
        recordingsToProcess.push(recording);
      } else {
        pageSkippedCount++;
      }
    }

    if (recordingsToProcess.length > 0) {
      // Create sessions - process serially to avoid race conditions
      for (const recording of recordingsToProcess) {
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

        if (!recording.person?.uuid) {
          // recording is not associated with a person, so we will skip it
          continue;
        }

        // upsert the project group to avoid duplicates
        let projectGroupId: string | null = null;
        if (groupId) {
          const { data: projectGroup, error: upsertError } = await supabase
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

          if (upsertError) {
            console.error(
              `❌ [PULL] Error upserting project group for recording ${recording.id}:`,
              upsertError,
            );
            Sentry.captureException(upsertError, {
              tags: { job: "syncSessions", step: "upsertProjectGroup" },
              extra: { externalId: recording.id, sourceId: source.id },
            });
          } else if (projectGroup) {
            projectGroupId = projectGroup.id;
          }
        }

        // upsert the project user to avoid duplicates
        let projectUserId: string | null = null;
        const { data: projectUser, error: upsertError } = await supabase
          .from("project_users")
          .upsert(
            {
              project_id: source.project_id,
              external_id: recording.person?.uuid,
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
              session_at: recording.end_time,
            },
            {
              onConflict: "project_id,external_id",
              ignoreDuplicates: false,
            },
          )
          .select("id")
          .single();

        if (upsertError) {
          console.error(
            `❌ [PULL] Error upserting project user for recording ${recording.id}:`,
            upsertError,
          );
          Sentry.captureException(upsertError, {
            tags: { job: "syncSessions", step: "upsertProjectUser" },
            extra: { externalId: recording.id, sourceId: source.id },
          });
        } else if (projectUser) {
          projectUserId = projectUser.id;
        }

        // if we couldn't create a project user, we will skip this recording
        if (!projectUserId) continue;

        const { data: newSession, error: insertError } = await supabase
          .from("sessions")
          .insert({
            source_id: source.id,
            project_id: source.project_id,
            external_id: recording.id,
            project_user_id: projectUserId,
            project_group_id: projectGroupId,
            status: "pending",
            session_at: recording.end_time,
            total_duration: recording.recording_duration,
            active_duration: recording.active_seconds,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error(
            `❌ [SYNC SESSIONS] Error creating session for recording ${recording.id}:`,
            insertError,
          );
          Sentry.captureException(insertError, {
            tags: { job: "syncSessions", step: "insertSession" },
            extra: { externalId: recording.id, sourceId: source.id },
          });
        } else {
          pageNewCount++;
          if (newSession) {
            createdSessionIds.push(newSession.id);
          }
        }
      }
    }

    console.log(
      `📊 [PULL] Page ${pageNumber} summary: ${pageNewCount} new, ${pageSkippedCount} skipped, ${domainFilteredCount} filtered by domain, ${activeSecondsFilteredCount} filtered by active seconds`,
    );

    totalNewSessionCount += pageNewCount;
    totalSkippedCount += pageSkippedCount;

    // Move to next page
    offset += 100;
    pageNumber++;

    if (pageNumber > DEBUG_MAX_PAGES) {
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
    `📊 [SYNC SESSIONS] Total summary: ${totalNewSessionCount} new, ${totalSkippedCount} skipped across ${pageNumber - 1} pages (filtered: domain=${source.projects.domain}, active_seconds>=30)`,
  );

  // Update source last_active_at
  const { error: updateError } = await supabase
    .from("sources")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", source.id);

  if (updateError) {
    console.error(
      `⚠️ [SYNC SESSIONS] Failed to update source last_active_at:`,
      updateError,
    );
  }

  return createdSessionIds;
}
