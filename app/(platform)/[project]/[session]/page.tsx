import { Suspense } from "react";
import { SessionHeader, SessionHeaderSkeleton } from "./session-header";
import { SessionContent, SessionContentSkeleton } from "./session-content";
import serverSupabase from "@/lib/supabase/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ project: string; session: string }>;
}): Promise<Metadata> {
  const { project: projectSlug, session: sessionId } = await params;
  const supabase = await serverSupabase();
  
  const { data: session } = await supabase
    .from("sessions")
    .select("distinct_id, started_at")
    .eq("id", sessionId)
    .single();

  let sessionTitle = "Session";
  if (session) {
    if (session.distinct_id) {
      sessionTitle = session.distinct_id;
    } else if (session.started_at) {
      const date = new Date(session.started_at);
      sessionTitle = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }
  
  return {
    title: `${sessionTitle} • VES AI`,
    description: `View detailed AI analysis of ${sessionTitle} including bugs, UX issues, and improvement opportunities.`,
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