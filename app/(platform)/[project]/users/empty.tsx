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
          label: "Syncing users from Posthog sessions",
          checkFn: async () => {
            // check if there are any project users
            const { count } = await supabase
              .from("project_users")
              .select("id", { count: "exact", head: true })
              .eq("project_id", projectId);
            return !!count;
          },
        },
        {
          label: "Analyzing users",
          checkFn: async () => {
            // check if there are any analyzed users
            const { count } = await supabase
              .from("project_users")
              .select("id", { count: "exact", head: true })
              .eq("project_id", projectId)
              .eq("status", "analyzed");
            return !!count;
          },
        },
      ]}
      finishFn={async () => {
        // get the most recently analyzed user
        const { data: user } = await supabase
          .from("project_users")
          .select("id")
          .eq("project_id", projectId)
          .eq("status", "analyzed")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (user) return `/${projectSlug}/users/${user.id}`;
      }}
    />
  );
}
