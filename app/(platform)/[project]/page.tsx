import { Suspense } from "react";
import { after } from "next/server";
import { ProjectHeader, ProjectHeaderSkeleton } from "./project-header";
import { Metrics, MetricsSkeleton } from "./metrics";
import { Sessions, SessionsSkeleton } from "./sessions";
import adminSupabase from "@/lib/supabase/admin";

export default async function ProjectDashboard({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;

  // Trigger run job for this project after response is sent
  after(async () => {
    try {
      const supabase = adminSupabase();

      // Get project ID from slug
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("slug", projectSlug)
        .single();

      if (project) {
        console.log(
          `🚀 [DASHBOARD] Triggering run job for project ${project.id}`,
        );

        // Trigger the run job for this specific project
        setTimeout(() => {
          fetch(
            `${process.env.NEXT_PUBLIC_URL}/jobs/run?project_id=${project.id}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${process.env.CRON_SECRET}`,
              },
            },
          ).catch((_) => {});
        }, 1000);
      }
    } catch (error) {
      console.error(`❌ [DASHBOARD] Failed to trigger run job:`, error);
    }
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <Suspense fallback={<ProjectHeaderSkeleton />}>
        <ProjectHeader projectSlug={projectSlug} />
      </Suspense>

      <Suspense fallback={<MetricsSkeleton />}>
        <Metrics projectSlug={projectSlug} />
      </Suspense>

      <Suspense fallback={<SessionsSkeleton />}>
        <Sessions projectSlug={projectSlug} />
      </Suspense>
    </div>
  );
}
