import serverSupabase from "@/lib/supabase/server";
import { format } from "date-fns";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import UserHealth from "./health";
import UserStory from "./story";
import UserSessions from "./sessions";
import UserHeader from "./header";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ project: string; user: string }>;
}): Promise<Metadata> {
  const { project: projectSlug, user: userId } = await params;
  const supabase = await serverSupabase();

  const { data: user } = await supabase
    .from("project_users")
    .select("name, created_at")
    .eq("id", userId)
    .single();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("slug", projectSlug)
    .single();

  return {
    title: `${user?.name || (user?.created_at ? format(new Date(user.created_at), "EEEE MMMM d h:mmaaa") : "User")} • ${project?.name || "Project"} • VES AI`,
  };
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ project: string; user: string }>;
}) {
  const { project: projectSlug, user: userId } = await params;

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

  return (
    <main className="flex-1 p-4">
      <Suspense fallback={<HeaderSkeleton />}>
        <LoadedHeader userId={userId} projectId={project.id} />
      </Suspense>
      <div className="flex w-full flex-col gap-4">
        <Suspense fallback={<HealthSkeleton />}>
          <LoadedHealth userId={userId} projectId={project.id} />
        </Suspense>
        <Suspense fallback={<StorySkeleton />}>
          <LoadedStory userId={userId} projectId={project.id} />
        </Suspense>
        <Suspense fallback={<SessionsSkeleton />}>
          <LoadedSessions userId={userId} projectId={project.id} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoadedHeader({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data: user } = await supabase
    .from("project_users")
    .select("*, group:project_groups(*), sessions(*)")
    .eq("id", userId)
    .eq("project_id", projectId)
    .single();

  if (!user) redirect(`/`);

  return <UserHeader user={user} />;
}

async function LoadedHealth({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data } = await supabase
    .from("project_users")
    .select("score, health")
    .eq("id", userId)
    .eq("project_id", projectId)
    .single();

  if (!data) return null;

  return <UserHealth score={data.score} health={data.health} />;
}

async function LoadedStory({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data } = await supabase
    .from("project_users")
    .select("story")
    .eq("id", userId)
    .eq("project_id", projectId)
    .single();

  if (!data) return null;

  return <UserStory story={data.story} />;
}

async function LoadedSessions({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .order("session_at", { ascending: false });

  return <UserSessions sessions={sessions || []} />;
}

function HeaderSkeleton() {
  return (
    <div className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-9 w-48 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="h-5 w-32 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-24 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-36 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );
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
