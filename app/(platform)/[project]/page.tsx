import { Suspense } from "react";
import { ProjectHeader, ProjectHeaderSkeleton } from "./project-header";
import { Metrics, MetricsSkeleton } from "./metrics";
import { Sessions, SessionsSkeleton } from "./sessions";
import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ project: string }>;
}): Promise<Metadata> {
  const { project: projectSlug } = await params;
  const supabase = await serverSupabase();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("slug", projectSlug)
    .single();

  const projectName = project?.name || "Project";

  return {
    title: `${projectName} • VES AI`,
    description: `View metrics and manage AI-powered session analysis for ${projectName}.`,
  };
}

export default async function ProjectDashboard({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;

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
