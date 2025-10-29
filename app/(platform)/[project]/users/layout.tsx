import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { platformConfig } from "../queries";
import { SectionNavSkeleton } from "../section-nav";
import UsersList from "./list";

export default async function ProjectUsersLayout({
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
        <LoadedUsers projectSlug={projectSlug} />
      </Suspense>
      {children}
    </>
  );
}

async function LoadedUsers({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();

  const { project } = await platformConfig({ projectSlug });

  if (!project) redirect("/home");

  const { data: users } = await supabase
    .from("project_users")
    .select("*, group:project_groups(*), sessions(*)")
    .eq("project_id", project.id)
    .eq("status", "analyzed")
    .order("created_at", { ascending: false });

  return (
    <>
      <UsersList initialUsers={users || []} project={project} />
    </>
  );
}
