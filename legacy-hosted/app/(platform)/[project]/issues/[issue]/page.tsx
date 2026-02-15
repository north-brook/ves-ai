import serverSupabase from "@/lib/supabase/server";
import { format } from "date-fns";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import IssueHeader from "./header";
import IssueSessions from "./sessions";
import IssueStory from "./story";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ project: string; issue: string }>;
}): Promise<Metadata> {
  const { project: projectSlug, issue: issueId } = await params;
  const supabase = await serverSupabase();

  const { data: issue } = await supabase
    .from("issues")
    .select("name, created_at")
    .eq("id", issueId)
    .single();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("slug", projectSlug)
    .single();

  return {
    title: `${issue?.name || (issue?.created_at ? format(new Date(issue.created_at), "EEEE MMMM d h:mmaaa") : "Issue")} • ${project?.name || "Project"} • VES AI`,
  };
}

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ project: string; issue: string }>;
}) {
  const { project: projectSlug, issue: issueId } = await params;

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
        <LoadedHeader issueId={issueId} projectId={project.id} />
      </Suspense>
      <div className="flex w-full flex-col gap-4">
        <Suspense fallback={<StorySkeleton />}>
          <LoadedStory issueId={issueId} projectId={project.id} />
        </Suspense>
        <Suspense fallback={<SessionsSkeleton />}>
          <LoadedSessions issueId={issueId} projectId={project.id} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoadedHeader({
  issueId,
  projectId,
}: {
  issueId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data: issue } = await supabase
    .from("issues")
    .select("*, sessions(*, user:project_users(*), group:project_groups(*))")
    .eq("id", issueId)
    .eq("project_id", projectId)
    .single();

  if (!issue) redirect(`/`);

  return <IssueHeader issue={issue} />;
}

async function LoadedStory({
  issueId,
  projectId,
}: {
  issueId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data } = await supabase
    .from("issues")
    .select("story")
    .eq("id", issueId)
    .eq("project_id", projectId)
    .single();

  if (!data) return null;

  return <IssueStory story={data.story} />;
}

async function LoadedSessions({
  issueId,
  projectId,
}: {
  issueId: string;
  projectId: string;
}) {
  const supabase = await serverSupabase();
  const { data: sessionIssues } = await supabase
    .from("session_issues")
    .select("session:sessions(*,user:project_users(*),group:project_groups(*))")
    .eq("issue_id", issueId)
    .eq("project_id", projectId);

  const sessions = sessionIssues?.map((si) => si.session) || [];

  return <IssueSessions sessions={sessions} />;
}

function HeaderSkeleton() {
  return (
    <div className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-9 w-64 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="h-5 w-28 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-24 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-20 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-32 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-36 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-28 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
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
