import serverSupabase from "@/lib/supabase/server";
import { format } from "date-fns";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import SessionHeader from "./header";
import SessionHealth from "./health";
import SessionIssues, { IssuesSkeleton } from "./issues";
import SessionReplaySection from "./replay";
import SessionStory from "./story";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ project: string; session: string }>;
}): Promise<Metadata> {
  const { project: projectSlug, session: sessionId } = await params;
  const supabase = await serverSupabase();

  const { data: session } = await supabase
    .from("sessions")
    .select("name, session_at")
    .eq("id", sessionId)
    .single();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("slug", projectSlug)
    .single();

  return {
    title: `${session?.name || (session?.session_at ? format(new Date(session.session_at), "EEEE MMMM d h:mmaaa") : "Session")} • ${project?.name || "Project"} • VES AI`,
  };
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ project: string; session: string }>;
}) {
  const { project: projectSlug, session: sessionId } = await params;

  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", projectSlug)
    .single();
  if (!project) redirect("/home");

  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", project.id)
    .eq("user_id", authUser.id)
    .single();
  if (!role) redirect("/home");

  return (
    <main className="flex-1 p-4">
      <Suspense fallback={<HeaderSkeleton />}>
        <LoadedHeader sessionId={sessionId} projectId={project.id} />
      </Suspense>
      <div className="flex w-full flex-col gap-4">
        <Suspense fallback={<HealthSkeleton />}>
          <LoadedHealth sessionId={sessionId} projectId={project.id} />
        </Suspense>
        <Suspense fallback={<ReplaySkeleton />}>
          <LoadedReplay sessionId={sessionId} projectId={project.id} />
        </Suspense>
        <Suspense fallback={<StorySkeleton />}>
          <LoadedStory sessionId={sessionId} projectId={project.id} />
        </Suspense>
        <Suspense fallback={<IssuesSkeleton />}>
          <LoadedIssues sessionId={sessionId} projectId={project.id} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoadedHeader({
  sessionId,
  projectId,
}: {
  sessionId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data: session } = await supabase
    .from("sessions")
    .select("*, user:project_users(*), group:project_groups(*), issues(*)")
    .eq("id", sessionId)
    .eq("project_id", projectId)
    .single();

  const { data: source } = await supabase
    .from("sources")
    .select("source_project")
    .eq("project_id", projectId)
    .limit(1)
    .single();

  if (!session || !source) notFound();

  return <SessionHeader session={session} source={source} />;
}

async function LoadedHealth({
  sessionId,
  projectId,
}: {
  sessionId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data } = await supabase
    .from("sessions")
    .select("score, health")
    .eq("id", sessionId)
    .eq("project_id", projectId)
    .single();

  if (!data) return null;

  return <SessionHealth score={data.score} health={data.health} />;
}

async function LoadedReplay({
  sessionId,
  projectId,
}: {
  sessionId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data } = await supabase
    .from("sessions")
    .select("id, video_uri")
    .eq("id", sessionId)
    .eq("project_id", projectId)
    .single();

  if (!data || !data.video_uri) return null;

  return <SessionReplaySection sessionId={sessionId} />;
}

async function LoadedStory({
  sessionId,
  projectId,
}: {
  sessionId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data } = await supabase
    .from("sessions")
    .select("story")
    .eq("id", sessionId)
    .eq("project_id", projectId)
    .single();

  if (!data) return null;

  return <SessionStory story={data.story} />;
}

async function LoadedIssues({
  sessionId,
  projectId,
}: {
  sessionId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data: sessionIssues } = await supabase
    .from("session_issues")
    .select("issue:issues(*)")
    .eq("session_id", sessionId)
    .eq("project_id", projectId);

  const issues = sessionIssues?.map((si) => si.issue) || [];

  return <SessionIssues issues={issues} />;
}

function HeaderSkeleton() {
  return (
    <div className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-9 w-64 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="h-5 w-28 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-20 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-20 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-20 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-32 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="h-7 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-7 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-7 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
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

function ReplaySkeleton() {
  return (
    <div className="aspect-video w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
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
