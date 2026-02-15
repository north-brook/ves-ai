import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ProjectForm from "./form";

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
    title: `Settings • ${projectName} • VES AI`,
  };
}

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  return (
    <main className="flex h-full w-full flex-col items-center justify-start gap-10 px-4 py-16">
      <Suspense fallback={<ProjectSettingsSkeleton />}>
        <LoadedProjectSettings params={params} />
      </Suspense>
    </main>
  );
}

async function LoadedProjectSettings({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;
  const supabase = await serverSupabase();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, slug, domain, image")
    .eq("slug", projectSlug)
    .single();

  if (!project) redirect("/home");

  return <ProjectForm project={project} />;
}

function ProjectSettingsSkeleton() {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      <div className="flex gap-4">
        <div className="h-[50px] w-[50px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
        <div className="h-[50px] flex-1 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
      </div>
      <div className="space-y-2">
        <div className="h-5 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
        <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
      </div>
      <div className="space-y-2">
        <div className="h-5 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
        <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
      </div>
      <div className="h-12 w-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
    </div>
  );
}
