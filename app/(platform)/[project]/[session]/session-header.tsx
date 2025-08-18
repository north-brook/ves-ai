import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SessionHeaderClient } from "./session-header-client";

export async function SessionHeader({ 
  projectSlug, 
  sessionId 
}: { 
  projectSlug: string;
  sessionId: string;
}) {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", projectSlug)
    .single();

  if (!project) {
    redirect("/home");
  }

  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", project.id)
    .eq("user_id", authUser.id)
    .single();

  if (!role) {
    redirect("/home");
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("project_id", project.id)
    .single();

  if (!session) {
    redirect(`/${projectSlug}`);
  }

  return (
    <SessionHeaderClient initialSession={session} projectSlug={projectSlug} />
  );
}

export function SessionHeaderSkeleton() {
  return (
    <div className="mb-8 border-b border-border pb-6">
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-surface-secondary" />
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-9 w-64 animate-pulse rounded bg-surface-secondary" />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="h-4 w-32 animate-pulse rounded bg-surface-secondary" />
            <div className="h-4 w-40 animate-pulse rounded bg-surface-secondary" />
            <div className="h-4 w-20 animate-pulse rounded bg-surface-secondary" />
          </div>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-surface-secondary" />
            ))}
          </div>
        </div>
        <div className="h-7 w-24 animate-pulse rounded-full bg-surface-secondary" />
      </div>
    </div>
  );
}