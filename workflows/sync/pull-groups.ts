import adminSupabase from "@/lib/supabase/admin";
import { Json } from "@/schema";
import * as Sentry from "@sentry/nextjs";
import { FatalError, RetryableError } from "workflow";

function parseRetryAfter(response: Response): number {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) return seconds;
  }
  return 60; // Default fallback
}

export async function pullGroups(sourceId: string): Promise<{
  groupNames: Record<string, string>;
  groupProperties: Record<string, Json>;
}> {
  "use step";

  const supabase = adminSupabase();

  console.log(`🔍 [PULL GROUPS] Pulling groups for source: ${sourceId}`);

  // get source
  const { data: source } = await supabase
    .from("sources")
    .select("source_key, source_project")
    .eq("id", sourceId)
    .single();

  if (!source) {
    const error = new Error("Source not found");
    Sentry.captureException(error, {
      tags: { job: "syncSessions", step: "pullGroups" },
      extra: { sourceId },
    });
    throw new FatalError("Source not found");
  }

  const groupNames: Record<string, string> = {};
  const groupProperties: Record<string, Json> = {};
  let query: string | null =
    `https://us.posthog.com/api/projects/${source.source_project}/groups/?group_type_index=0`;

  while (true) {
    try {
      // get posthog groups
      const groupResponse = await fetch(query, {
        headers: {
          Authorization: `Bearer ${source.source_key}`,
          "Content-Type": "application/json",
        },
      });

      if (groupResponse.status === 429) {
        const retryAfter = parseRetryAfter(groupResponse);
        console.warn(
          `⏳ [PULL GROUPS] PostHog rate limited, retrying after ${retryAfter}`,
        );
        throw new RetryableError("PostHog rate limited", { retryAfter });
      }

      if (!groupResponse.ok) {
        const error = new Error(
          `PostHog API request failed: ${groupResponse.status} ${groupResponse.statusText}`,
        );
        console.error(`❌ [PULL GROUPS] PostHog API error:`, error);
        Sentry.captureException(error, {
          tags: { job: "syncSessions", step: "pullGroups" },
          extra: {
            sourceId,
            status: groupResponse.status,
            statusText: groupResponse.statusText,
          },
        });
        throw error;
      }

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
    } catch (error) {
      console.error(`❌ [PULL GROUPS] Error pulling groups:`, error);
      Sentry.captureException(error, {
        tags: { job: "syncSessions", step: "pullGroups" },
        extra: { sourceId, query },
      });
      throw error;
    }
  }

  return { groupNames, groupProperties };
}
