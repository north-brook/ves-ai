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
          label: "Detecting issues from analyzed sessions",
          checkFn: async () => {
            // check if there are any issues
            const { count } = await supabase
              .from("issues")
              .select("id", { count: "exact", head: true })
              .eq("project_id", projectId);
            return !!count;
          },
        },
        {
          label: "Analyzing issues",
          checkFn: async () => {
            // check if there are any analyzed issues
            const { count } = await supabase
              .from("issues")
              .select("id", { count: "exact", head: true })
              .eq("project_id", projectId)
              .eq("status", "analyzed");
            return !!count;
          },
        },
      ]}
      finishFn={async () => {
        // get the most recently analyzed issue
        const { data: issue } = await supabase
          .from("issues")
          .select("id")
          .eq("project_id", projectId)
          .eq("status", "analyzed")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (issue) return `/${projectSlug}/issues/${issue.id}`;
      }}
    />
  );
}
