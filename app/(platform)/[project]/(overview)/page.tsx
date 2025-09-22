import { Suspense } from "react";
import { Metrics, MetricsSkeleton } from "./metrics";
import { RecentSessions, RecentSessionsSkeleton } from "./sessions";
import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import PriorityIssues, { PriorityIssuesSkeleton } from "./issues";

export const revalidate = 0;

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
  };
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;

  return (
    <>
      {/* <Suspense fallback={<MetricsSkeleton />}>
        <Metrics projectSlug={projectSlug} />
      </Suspense> */}

      <Suspense fallback={<PriorityIssuesSkeleton />}>
        <PriorityIssues projectSlug={projectSlug} />
      </Suspense>

      <Suspense fallback={<RecentSessionsSkeleton />}>
        <RecentSessions projectSlug={projectSlug} />
      </Suspense>
    </>
  );
}
