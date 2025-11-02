import adminSupabase from "@/lib/supabase/admin";
import { Json } from "@/schema";
import { FatalError } from "workflow";

export async function pullGroups(
  sourceId: string,
): Promise<{
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

  if (!source) throw new FatalError("Source not found");

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

  return { groupNames, groupProperties };
}
