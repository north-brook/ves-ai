import { Suspense } from "react";
import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import { platformConfig } from "../queries";
import UserList from "./list";

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

  const { project } = await platformConfig({ projectSlug });

  const supabase = await serverSupabase();

  const { data: users } = await supabase
    .from("project_users")
    .select("*, group:project_groups(*)")
    .eq("project_id", project.id);

  return (
    <>
      <UserList initialUsers={users || []} project={project} />
    </>
  );
}
