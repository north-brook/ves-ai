import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SessionContentClient } from "./session-content-client";

export async function SessionContent({ 
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

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("project_id", project.id)
    .single();

  if (!session) {
    redirect(`/${projectSlug}`);
  }

  const { data: tickets } = await supabase
    .from("session_tickets")
    .select("*, tickets(*)")
    .eq("session_id", session.id);

  const ticketsList = tickets ? tickets.map(t => t.tickets).filter(Boolean) : [];

  return (
    <SessionContentClient 
      initialSession={session} 
      initialTickets={ticketsList}
    />
  );
}

export function SessionContentSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-8">
        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-4 h-7 w-32 animate-pulse rounded bg-surface-secondary" />
          <div className="aspect-video w-full animate-pulse rounded-lg bg-black/20" />
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-4 h-7 w-32 animate-pulse rounded bg-surface-secondary" />
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-surface-secondary" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-surface-secondary" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-surface-secondary" />
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-4 h-6 w-32 animate-pulse rounded bg-surface-secondary" />
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-secondary" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}