import serverSupabase from "@/lib/supabase/server";
import { format } from "date-fns";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import SessionContent from "./content";
import SessionHeader from "./header";

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
  return (
    <>
      <Suspense fallback={<SessionSkeleton />}>
        <LoadedSession params={params} />
      </Suspense>
    </>
  );
}

async function LoadedSession({
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

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*, user:project_users(*), group:project_groups(*), issues(*)")
    .eq("id", sessionId)
    .eq("project_id", project.id)
    .single();

  if (sessionError) console.error(sessionError);
  if (!session) redirect(`/${projectSlug}/sessions`);

  return (
    <main className="flex-1 p-4">
      <SessionHeader session={session} />
      <SessionContent session={session} />
    </main>
  );
}

function SessionSkeleton() {
  return (
    <main className="flex-1 p-4">
      <div className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-9 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-7 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"
                />
              ))}
            </div>
          </div>
          <div className="h-7 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
      <div className="flex w-full flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 h-7 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="aspect-video w-full animate-pulse rounded-lg bg-black/20" />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 h-7 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </main>
  );
}
