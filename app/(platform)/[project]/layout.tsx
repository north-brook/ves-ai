import NoAccess from "@/app/auth/no-access";
import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import SideBar from "./sidebar";
import SyncSessions from "./sync";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProjectLayout({
  children,
  params,
}: {
  params: Promise<{ project: string }>;
  children: React.ReactNode;
}) {
  const supabase = await serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { project: projectSlug } = await params;
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("slug", projectSlug)
    .single();
  if (!project) notFound();

  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .single();
  if (!role) return <NoAccess project={project} authUser={user} />;

  return (
    <>
      <div className="flex min-h-[calc(100vh-48px)] w-full flex-row pl-12">
        {children}
      </div>
      <SideBar params={params} />
      <SyncSessions />
    </>
  );
}
