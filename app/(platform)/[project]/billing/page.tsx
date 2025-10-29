import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import WIP from "../wip";

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
    title: `Billing • ${projectName} • VES AI`,
  };
}

export default async function ProjectBillingPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  return <WIP />;
}
