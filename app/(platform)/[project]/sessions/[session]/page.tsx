import { Suspense } from "react";
import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { SessionContent } from "./content";
import { SessionHeader } from "./header";

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
    description: `View detailed AI session analysis including bugs, UX issues, and improvement opportunities.`,
  };
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ project: string; session: string }>;
}) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <Suspense fallback={<SessionSkeleton />}>
        <LoadedSession params={params} />
      </Suspense>
    </div>
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
    .select("*")
    .eq("id", sessionId)
    .eq("project_id", project.id)
    .single();

  if (sessionError) console.error(sessionError);
  if (!session) redirect(`/${projectSlug}`);

  return (
    <>
      <SessionHeader session={session} project={project} />
      <SessionContent session={session} issues={[]} />
    </>
  );
}

function SessionSkeleton() {
  return (
    <>
      <div className="border-border mb-8 border-b pb-6">
        <div className="bg-surface-secondary mb-4 h-4 w-32 animate-pulse rounded" />
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="bg-surface-secondary h-9 w-64 animate-pulse rounded" />
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="bg-surface-secondary h-4 w-32 animate-pulse rounded" />
              <div className="bg-surface-secondary h-4 w-40 animate-pulse rounded" />
              <div className="bg-surface-secondary h-4 w-20 animate-pulse rounded" />
            </div>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-surface-secondary h-7 w-20 animate-pulse rounded-full"
                />
              ))}
            </div>
          </div>
          <div className="bg-surface-secondary h-7 w-24 animate-pulse rounded-full" />
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="border-border bg-surface rounded-lg border p-6">
            <div className="bg-surface-secondary mb-4 h-7 w-32 animate-pulse rounded" />
            <div className="aspect-video w-full animate-pulse rounded-lg bg-black/20" />
          </div>

          <div className="border-border bg-surface rounded-lg border p-6">
            <div className="bg-surface-secondary mb-4 h-7 w-32 animate-pulse rounded" />
            <div className="space-y-3">
              <div className="bg-surface-secondary h-4 w-full animate-pulse rounded" />
              <div className="bg-surface-secondary h-4 w-5/6 animate-pulse rounded" />
              <div className="bg-surface-secondary h-4 w-4/6 animate-pulse rounded" />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="border-border bg-surface rounded-lg border p-6">
            <div className="bg-surface-secondary mb-4 h-6 w-32 animate-pulse rounded" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-surface-secondary h-16 animate-pulse rounded-lg"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
