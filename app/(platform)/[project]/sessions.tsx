import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SessionList } from "./session-list";

export async function Sessions({ projectSlug }: { projectSlug: string }) {
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

  const currentDate = new Date();
  const startOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("project_id", project.id)
    .gte("created_at", startOfMonth.toISOString())
    .order("session_at", { ascending: false });

  // Get ticket counts for all sessions
  const sessionIds = sessions?.map((s) => s.id) || [];
  const { data: sessionTickets } = await supabase
    .from("session_tickets")
    .select("session_id")
    .in("session_id", sessionIds);

  // Count tickets per session
  const ticketCounts =
    sessionTickets?.reduce(
      (acc, st) => {
        acc[st.session_id] = (acc[st.session_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ) || {};

  // Add ticket count to each session
  const sessionsWithTickets =
    sessions?.map((session) => ({
      ...session,
      ticketCount: ticketCounts[session.id] || 0,
    })) || [];

  return (
    <SessionList 
      sessions={sessionsWithTickets} 
      projectSlug={projectSlug} 
      projectId={project.id}
    />
  );
}

export function SessionsSkeleton() {
  return (
    <div className="border-border bg-surface rounded-lg border">
      <div className="border-border border-b p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="bg-surface-secondary h-7 w-32 animate-pulse rounded" />
          <div className="bg-surface-secondary h-10 w-64 animate-pulse rounded-lg" />
        </div>
      </div>
      <div className="divide-border divide-y">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-surface-secondary h-5 w-48 animate-pulse rounded" />
                <div className="bg-surface-secondary h-6 w-20 animate-pulse rounded-full" />
              </div>
              <div className="flex gap-4">
                <div className="bg-surface-secondary h-4 w-24 animate-pulse rounded" />
                <div className="bg-surface-secondary h-4 w-16 animate-pulse rounded" />
                <div className="bg-surface-secondary h-4 w-32 animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
