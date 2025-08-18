import { Suspense } from "react";
import { SessionHeader, SessionHeaderSkeleton } from "./session-header";
import { SessionContent, SessionContentSkeleton } from "./session-content";
import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";
import { format } from "date-fns";

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
  const { project: projectSlug, session: sessionId } = await params;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <Suspense fallback={<SessionHeaderSkeleton />}>
        <SessionHeader projectSlug={projectSlug} sessionId={sessionId} />
      </Suspense>

      <Suspense fallback={<SessionContentSkeleton />}>
        <SessionContent projectSlug={projectSlug} sessionId={sessionId} />
      </Suspense>
    </div>
  );
}
