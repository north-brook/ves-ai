import serverSupabase from "@/lib/supabase/server";
import { format } from "date-fns";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import GroupHealth from "./health";
import GroupStory from "./story";
import GroupSessions from "./sessions";
import GroupHeader from "./header";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ project: string; group: string }>;
}): Promise<Metadata> {
  const { project: projectSlug, group: groupId } = await params;
  const supabase = await serverSupabase();

  const { data: group } = await supabase
    .from("project_groups")
    .select("name, analyzed_at")
    .eq("id", groupId)
    .single();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("slug", projectSlug)
    .single();

  return {
    title: `${group?.name || (group?.analyzed_at ? format(new Date(group.analyzed_at), "EEEE MMMM d h:mmaaa") : "Group")} • ${project?.name || "Project"} • VES AI`,
  };
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ project: string; group: string }>;
}) {
  const { project: projectSlug, group: groupId } = await params;

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

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", project.id)
    .eq("user_id", authUser.id)
    .single();

  if (roleError) console.error(roleError);
  if (!role) redirect("/home");

  const { data: group, error: groupError } = await supabase
    .from("project_groups")
    .select("*")
    .eq("id", groupId)
    .eq("project_id", project.id)
    .single();

  if (groupError) console.error(groupError);
  if (!group) redirect(`/${projectSlug}/groups`);

  return (
    <main className="flex-1 p-4">
      <GroupHeader group={group} />
      <div className="flex w-full flex-col gap-4">
        <Suspense fallback={<HealthSkeleton />}>
          <LoadedHealth groupId={groupId} projectId={project.id} />
        </Suspense>
        <Suspense fallback={<StorySkeleton />}>
          <LoadedStory groupId={groupId} projectId={project.id} />
        </Suspense>
        <Suspense fallback={<SessionsSkeleton />}>
          <LoadedSessions groupId={groupId} projectId={project.id} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoadedHealth({
  groupId,
  projectId,
}: {
  groupId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data } = await supabase
    .from("project_groups")
    .select("score, health")
    .eq("id", groupId)
    .eq("project_id", projectId)
    .single();

  if (!data) return null;

  return <GroupHealth score={data.score} health={data.health} />;
}

async function LoadedStory({
  groupId,
  projectId,
}: {
  groupId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data } = await supabase
    .from("project_groups")
    .select("story")
    .eq("id", groupId)
    .eq("project_id", projectId)
    .single();

  if (!data) return null;

  return <GroupStory story={data.story} />;
}

async function LoadedSessions({
  groupId,
  projectId,
}: {
  groupId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, user:project_users(*)")
    .eq("group_id", groupId)
    .eq("project_id", projectId)
    .order("session_at", { ascending: false });

  return <GroupSessions sessions={sessions || []} />;
}

function HealthSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

function StorySkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

function SessionsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex w-full flex-row items-stretch justify-start gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="aspect-video w-full max-w-[360px] shrink-0 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-7 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
