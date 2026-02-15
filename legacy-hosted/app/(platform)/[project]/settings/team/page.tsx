import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import TeamForm from "./form";

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
    title: `Team • ${projectName} • VES AI`,
  };
}

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  return (
    <main className="flex h-full w-full flex-col items-center justify-start gap-10 px-4 py-16">
      <Suspense fallback={<TeamSettingsSkeleton />}>
        <LoadedTeamSettings params={params} />
      </Suspense>
    </main>
  );
}

async function LoadedTeamSettings({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;
  const supabase = await serverSupabase();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get project
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, domain")
    .eq("slug", projectSlug)
    .single();

  if (!project) redirect("/home");

  // Get all roles for this project with user data
  const { data: roles } = await supabase
    .from("roles")
    .select(
      `
      id,
      user_email,
      user_id,
      created_at,
      users (
        id,
        first_name,
        last_name,
        image
      )
    `,
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });

  return (
    <TeamForm
      project={project}
      roles={roles || []}
      currentUserId={user.id}
    />
  );
}

function TeamSettingsSkeleton() {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      <div className="space-y-2">
        <div className="h-16 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-16 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
      </div>
      <div className="h-24 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
    </div>
  );
}
