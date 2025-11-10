"use client";

import SessionReplay from "../../replay";

export default function SessionReplaySection({
  sessionId,
}: {
  sessionId: string;
}) {
  return <SessionReplay sessionId={sessionId} className="w-full" />;
}
