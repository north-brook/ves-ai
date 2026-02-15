"use client";

import Loader from "@/components/loader";
import clientSupabase from "@/lib/supabase/client";

export default function Empty({
  projectId,
  projectSlug,
}: {
  projectId: string;
  projectSlug: string;
}) {
  const supabase = clientSupabase();
  return (
    <Loader
      stages={[
        {
          label: "Syncing groups from Posthog sessions",
          checkFn: async () => {
            // check if there are any project groups
            const { count } = await supabase
              .from("project_groups")
              .select("id", { count: "exact", head: true })
              .eq("project_id", projectId);
            return !!count;
          },
        },
        {
          label: "Analyzing groups",
          checkFn: async () => {
            // check if there are any analyzed groups
            const { count } = await supabase
              .from("project_groups")
              .select("id", { count: "exact", head: true })
              .eq("project_id", projectId)
              .eq("status", "analyzed");
            return !!count;
          },
        },
      ]}
      finishFn={async () => {
        // get the most recently analyzed group
        const { data: group } = await supabase
          .from("project_groups")
          .select("id")
          .eq("project_id", projectId)
          .eq("status", "analyzed")
          .order("session_at", { ascending: false })
          .limit(1)
          .single();
        if (group) return `/${projectSlug}/groups/${group.id}`;
      }}
    />
  );
}
