import { Suspense } from "react";
import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { platformConfig } from "../queries";
import { SessionList } from "./list";

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
    title: `Sessions • ${projectName} • VES AI`,
  };
}

export default async function ProjectSessionsPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;

  return (
    <>
      <Suspense fallback={<SessionsSkeleton />}>
        <LoadedSessions projectSlug={projectSlug} />
      </Suspense>
    </>
  );
}

async function LoadedSessions({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();

  const { project } = await platformConfig({ projectSlug });

  if (!project) redirect("/home");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, user:project_users(*), group:project_groups(*), issues(*)")
    .eq("project_id", project.id)
    .order("session_at", { ascending: false });

  return (
    <>
      <SessionList initialSessions={sessions || []} project={project} />
    </>
  );
}

function SessionsSkeleton() {
  return <div></div>;
}
