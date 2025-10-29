import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { platformConfig } from "../queries";
import { SectionNavSkeleton } from "../section-nav";
import GroupsList from "./list";

export default async function ProjectGroupsLayout({
  params,
  children,
}: {
  params: Promise<{ project: string }>;
  children: React.ReactNode;
}) {
  const { project: projectSlug } = await params;

  return (
    <>
      <Suspense fallback={<SectionNavSkeleton />}>
        <LoadedGroups projectSlug={projectSlug} />
      </Suspense>
      {children}
    </>
  );
}

async function LoadedGroups({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();

  const { project } = await platformConfig({ projectSlug });

  if (!project) redirect("/home");

  const { data: groups } = await supabase
    .from("project_groups")
    .select("*, users:project_users(*), sessions(*)")
    .eq("project_id", project.id)
    .eq("status", "analyzed")
    .order("analyzed_at", { ascending: false });

  return (
    <>
      <GroupsList initialGroups={groups || []} project={project} />
    </>
  );
}
