import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { platformConfig } from "../queries";
import { SectionNavSkeleton } from "../section-nav";
import IssueList from "./list";

export default async function ProjectSessionsLayout({
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
        <LoadedIssues projectSlug={projectSlug} />
      </Suspense>
      {children}
    </>
  );
}

async function LoadedIssues({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();

  const { project } = await platformConfig({ projectSlug });

  if (!project) redirect("/home");

  const { data: issues } = await supabase
    .from("issues")
    .select("*, sessions(*, user:project_users(*), group:project_groups(*))")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <IssueList initialIssues={issues || []} project={project} />
    </>
  );
}
