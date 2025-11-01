import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { platformConfig } from "../queries";
import { SectionNavSkeleton } from "../section-nav";
import SessionList from "./list";

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
        <LoadedSessions projectSlug={projectSlug} />
      </Suspense>
      {children}
    </>
  );
}

async function LoadedSessions({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();

  const { project } = await platformConfig({ projectSlug });

  if (!project) redirect("/home");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, session_at, score")
    .eq("project_id", project.id)
    .eq("status", "analyzed")
    .order("session_at", { ascending: false });

  return (
    <>
      <SessionList initialSessions={sessions || []} project={project} />
    </>
  );
}
