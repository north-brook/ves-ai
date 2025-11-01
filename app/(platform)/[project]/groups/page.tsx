import serverSupabase from "@/lib/supabase/server";
import { LoaderCircle } from "lucide-react";
import { Metadata } from "next";
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

  return {
    title: `Groups • ${project?.name || "Project"} • VES AI`,
  };
}

export default async function GroupsPage({
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
  const { data: group } = await supabase
    .from("project_groups")
    .select("id")
    .eq("project_id", project.id)
    .eq("status", "analyzed")
    .order("session_at", { ascending: false })
    .limit(1)
    .single();

  if (group) redirect(`/${projectSlug}/groups/${group.id}`);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <LoaderCircle className="h-6 w-6 animate-spin text-slate-600 dark:text-slate-400" />
      <p className="text-slate-600 dark:text-slate-400">Awaiting groups</p>
    </div>
  );
}
