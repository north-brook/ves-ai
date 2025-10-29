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
    title: `Sessions • ${project?.name || "Project"} • VES AI`,
  };
}
export default async function SessionsPage({
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
    .select("*")
    .eq("slug", projectSlug)
    .single();

  if (projectError) console.error(projectError);
  if (!project) redirect("/home");

  // get the most recent analyzed session
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("project_id", project.id)
    .eq("status", "analyzed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (session) redirect(`/${projectSlug}/sessions/${session.id}`);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <LoaderCircle className="h-6 w-6 animate-spin text-slate-600 dark:text-slate-400" />
      <p className="text-slate-600 dark:text-slate-400">Awaiting sessions</p>
    </div>
  );
}
