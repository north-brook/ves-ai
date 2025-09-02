"use server";

import serverSupabase from "@/lib/supabase/server";

export async function hasGroups(projectSlug: string) {
  const supabase = await serverSupabase();

  const { data: groups } = await supabase
    .from("project_groups")
    .select("id")
    .eq("project_id", projectSlug)
    .limit(1);

  return !!groups?.length;
}
