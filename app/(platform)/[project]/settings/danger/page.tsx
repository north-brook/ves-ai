import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import DangerForm from "./form";

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
    title: `Danger Zone • ${projectName} • VES AI`,
  };
}

export default async function DangerSettingsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  return (
    <main className="flex h-full w-full flex-col items-center justify-start gap-10 px-4 py-16">
      <Suspense fallback={<DangerSettingsSkeleton />}>
        <LoadedDangerSettings params={params} />
      </Suspense>
    </main>
  );
}

async function LoadedDangerSettings({
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
    .select("id, name, slug")
    .eq("slug", projectSlug)
    .single();

  if (!project) redirect("/home");

  // Check permissions
  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .single();

  if (!role) redirect("/home");

  return <DangerForm project={project} />;
}

function DangerSettingsSkeleton() {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      <div className="h-32 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
    </div>
  );
}
