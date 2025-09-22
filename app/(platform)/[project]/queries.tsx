import serverSupabase from "@/lib/supabase/server";
import { Project, Role } from "@/types";
import { redirect } from "next/navigation";

export async function platformConfig({
  projectSlug,
}: {
  projectSlug: string;
}): Promise<{ project: Project; role: Role }> {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", projectSlug)
    .single();

  if (!project) redirect("/home");

  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", project.id)
    .eq("user_id", authUser.id)
    .single();

  if (!role) redirect("/home");

  return { project, role };
}
