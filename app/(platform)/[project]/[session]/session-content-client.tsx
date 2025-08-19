"use client";

import { PostHogReplay } from "./posthog-replay";
import { SessionAnalysis } from "./session-analysis";
import { LinearTickets } from "./linear-tickets";
import { Session, Ticket } from "@/types";
import { SessionObservations } from "./session-observations";
import { SessionTldr } from "./session-tldr";

interface SessionContentClientProps {
  session: Session;
  tickets: Ticket[];
}

export function SessionContentClient({
  session,
  tickets,
}: SessionContentClientProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <PostHogReplay replayUrl={session.embed_url || ""} />

        {session.tldr && <SessionTldr tldr={session.tldr} />}

        {session.observations && session.observations.length > 0 && (
          <SessionObservations observations={session.observations} />
        )}

        {session.synthesis && <SessionAnalysis synthesis={session.synthesis} />}

        {!session.synthesis && (
          <>
            <h2 className="font-display mb-4 text-xl font-semibold">
              AI Analysis
            </h2>
            <div className="py-8 text-center">
              <p className="text-foreground-secondary italic">
                {session.status === "analyzing"
                  ? "Ready in ~1 min"
                  : session.status === "processing" ||
                      session.status === "processed" ||
                      session.status === "pending"
                    ? `Ready in ~${Math.max(5, Math.ceil((session.active_duration || 60) / 60))} mins`
                    : "Analysis unavailable"}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="lg:sticky lg:top-24 lg:h-fit">
        <div className="border-border bg-surface rounded-lg border p-6">
          <h3 className="font-display mb-4 text-lg font-semibold">Tickets</h3>
          {tickets.length > 0 ? (
            <LinearTickets tickets={tickets} />
          ) : (
            <p className="text-foreground-secondary text-sm italic">
              {session.status === "analyzed"
                ? "No linked tickets"
                : session.status === "analyzing"
                  ? "Ready in ~1 min"
                  : `Ready in ~${Math.max(5, Math.ceil((session.active_duration || 60) / 60))} mins`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
