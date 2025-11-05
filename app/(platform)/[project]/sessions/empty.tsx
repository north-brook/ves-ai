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
          label: "Syncing sessions from last 7 days",
          checkFn: async () => {
            // check if there are any sessions
            const { count } = await supabase
              .from("sessions")
              .select("id", { count: "exact", head: true })
              .eq("project_id", projectId);
            return !!count;
          },
        },
        {
          label: "Constructing videos from replay data",
          checkFn: async () => {
            // check if there are any non-pending sessions
            const { count } = await supabase
              .from("sessions")
              .select("id", { count: "exact", head: true })
              .eq("project_id", projectId)
              .neq("status", "pending");
            return !!count;
          },
        },
        {
          label: "Analyzing sessions",
          checkFn: async () => {
            // check if there are any analyzed sessions
            const { count } = await supabase
              .from("sessions")
              .select("id", { count: "exact", head: true })
              .eq("project_id", projectId)
              .eq("status", "analyzed")
              .single();
            return !!count;
          },
        },
      ]}
      finishFn={async () => {
        // get the most recently analyzed session
        const { data: session } = await supabase
          .from("sessions")
          .select("id")
          .eq("project_id", projectId)
          .eq("status", "analyzed")
          .order("session_at", { ascending: false })
          .limit(1)
          .single();
        if (session) return `/${projectSlug}/sessions/${session.id}`;
      }}
    />
  );
}
