"use server";

import serverSupabase from "@/lib/supabase/server";

export async function hasGroups(projectSlug: string) {
  const supabase = await serverSupabase();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", projectSlug)
    .single();

  if (!project) return false;

  const { data: groups } = await supabase
    .from("project_groups")
    .select("id")
    .eq("project_id", project.id)
    .limit(1);

  return !!groups?.length;
}
