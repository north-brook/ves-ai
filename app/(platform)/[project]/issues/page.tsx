import { Suspense } from "react";
import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import IssueList from "./list";
import { platformConfig } from "../queries";

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

  const { project } = await platformConfig({ projectSlug });

  const supabase = await serverSupabase();

  const { data: issues } = await supabase
    .from("issues")
    .select("*, sessions(id)")
    .eq("project_id", project.id);

  return (
    <>
      <IssueList initialIssues={issues || []} project={project} />
    </>
  );
}
