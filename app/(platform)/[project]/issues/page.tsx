import serverSupabase from "@/lib/supabase/server";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import Empty from "./empty";

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

  return {
    title: `Issues • ${project?.name || "Project"} • VES AI`,
  };
}

export default async function IssuesPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;

  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", projectSlug)
    .single();

  if (projectError) console.error(projectError);
  if (!project) redirect("/home");

  // get the most recent analyzed issue
  const { data: issue } = await supabase
    .from("issues")
    .select("id")
    .eq("project_id", project.id)
    .eq("status", "analyzed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (issue) redirect(`/${projectSlug}/issues/${issue.id}`);

  return <Empty projectId={project.id} projectSlug={projectSlug} />;
}
