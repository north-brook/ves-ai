import { linear } from "@/lib/linear";
import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import IntegrationsForm from "./form";

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
    title: `Integrations • ${projectName} • VES AI`,
  };
}

export default async function IntegrationsSettingsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  return (
    <main className="flex h-full w-full flex-col items-center justify-start gap-10 px-4 py-16">
      <Suspense fallback={<IntegrationsSettingsSkeleton />}>
        <LoadedIntegrationsSettings params={params} />
      </Suspense>
    </main>
  );
}

async function LoadedIntegrationsSettings({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;
  const supabase = await serverSupabase();

  // Get project
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, slug")
    .eq("slug", projectSlug)
    .single();

  if (!project) redirect("/home");

  // Get PostHog source
  const { data: source } = await supabase
    .from("sources")
    .select("id, source_key, source_host, source_project")
    .eq("project_id", project.id)
    .eq("type", "posthog")
    .single();

  // Get Linear destination
  const { data: destination } = await supabase
    .from("destinations")
    .select("id, destination_workspace, destination_team")
    .eq("project_id", project.id)
    .eq("type", "linear")
    .single();

  // Fetch Linear data if connected
  let linearData = null;
  if (destination) {
    try {
      const linearClient = await linear(project.id);
      const organization = await linearClient?.organization;
      const teams = await linearClient?.teams();

      if (organization && teams) {
        linearData = {
          organization: {
            name: organization.name,
            teams: teams.nodes.map((team) => ({
              id: team.id,
              key: team.key,
              name: team.name,
            })),
          },
        };
      }
    } catch (error) {
      console.error("Failed to fetch Linear data:", error);
    }
  }

  return (
    <IntegrationsForm
      project={project}
      source={source}
      destination={destination}
      linearData={linearData}
    />
  );
}

function IntegrationsSettingsSkeleton() {
  return (
    <div className="w-full max-w-2xl space-y-8">
      <div>
        <div className="mb-2 h-8 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
        <div className="h-5 w-64 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      </div>
      <div className="h-24 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
      <div className="h-24 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
    </div>
  );
}
