import { Suspense } from "react";
import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import { platformConfig } from "../queries";
import GroupList from "./list";
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
    title: `Groups • ${projectName} • VES AI`,
  };
}

export default async function ProjectGroupsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;

  return (
    <>
      <Suspense fallback={<GroupsSkeleton />}>
        <LoadedGroups projectSlug={projectSlug} />
      </Suspense>
    </>
  );
}

async function LoadedGroups({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();

  const { project } = await platformConfig({ projectSlug });

  if (!project) redirect("/home");

  // Fetch users with their groups and sessions (exclude pending users)
  const { data: groups } = await supabase
    .from("project_groups")
    .select("*, users:project_users(*), sessions(id)")
    .eq("project_id", project.id)
    .order("analyzed_at", { ascending: false });

  return (
    <>
      <GroupList initialGroups={groups || []} project={project} />
    </>
  );
}

function GroupsSkeleton() {
  return (
    <div className="w-full space-y-4">
      {/* Search bar skeleton */}
      <div className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />

      {/* User cards skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700"
          />
        ))}
      </div>
    </div>
  );
}
