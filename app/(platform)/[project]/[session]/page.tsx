import { Suspense } from "react";
import { SessionHeader, SessionHeaderSkeleton } from "./session-header";
import { SessionContent, SessionContentSkeleton } from "./session-content";

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