import { Suspense } from "react";
import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import IssueList from "./list";
import { platformConfig } from "../queries";
import { redirect } from "next/navigation";

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
    title: `Issues • ${projectName} • VES AI`,
  };
}

export default async function ProjectIssuesPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;

  return (
    <>
      <Suspense fallback={<IssuesSkeleton />}>
        <LoadedIssues projectSlug={projectSlug} />
      </Suspense>
    </>
  );
}

async function LoadedIssues({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();

  const { project } = await platformConfig({ projectSlug });

  if (!project) redirect("/home");

  const { data: issues } = await supabase
    .from("issues")
    .select("*, sessions(id)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <IssueList initialIssues={issues || []} project={project} />
    </>
  );
}

function IssuesSkeleton() {
  return (
    <div className="w-full space-y-4">
      {/* Search bar skeleton */}
      <div className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      
      {/* Issue cards skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
    </div>
  );
}
