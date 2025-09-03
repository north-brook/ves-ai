import { Suspense } from "react";
import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import { platformConfig } from "../queries";
import UserList from "./list";
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
    title: `Users • ${projectName} • VES AI`,
  };
}

export default async function ProjectUsersPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;

  return (
    <>
      <Suspense fallback={<UsersSkeleton />}>
        <LoadedUsers projectSlug={projectSlug} />
      </Suspense>
    </>
  );
}

async function LoadedUsers({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();

  const { project } = await platformConfig({ projectSlug });

  if (!project) redirect("/home");

  // Fetch users with their groups and sessions (exclude pending users)
  const { data: users } = await supabase
    .from("project_users")
    .select("*, group:project_groups(*), sessions(id)")
    .eq("project_id", project.id)
    .neq("status", "pending")
    .order("analyzed_at", { ascending: false });

  return (
    <>
      <UserList initialUsers={users || []} project={project} />
    </>
  );
}

function UsersSkeleton() {
  return (
    <div className="w-full space-y-4">
      {/* Search bar skeleton */}
      <div className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />

      {/* User cards skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
    </div>
  );
}
