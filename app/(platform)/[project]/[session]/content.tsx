"use client";

import { Badge } from "@/components/ui/badge";
import { Session, Ticket } from "@/types";
import { AlertCircle, CheckCircle, Circle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getVideoUrl } from "./actions";
import ReactPlayer from "react-player";
import { LoaderCircle, X } from "lucide-react";
import { Markdown } from "@/components/markdown";

export function SessionContent({
  session,
  tickets,
}: {
  session: Session;
  tickets: Ticket[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        {session.video_uri && <SessionReplay sessionId={session.id} />}

        {session.story && <SessionStory story={session.story} />}

        {session.observations && (
          <SessionObservations observations={session.observations} />
        )}

        {!session.story && (
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

function SessionReplay({ sessionId }: { sessionId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["session-replay", sessionId],
    queryFn: () => getVideoUrl(sessionId),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  return (
    <div className="border-border bg-surface rounded-lg border">
      {isLoading && (
        <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-black/10">
          <LoaderCircle className="animate-spin stroke-white" size={100} />
        </div>
      )}

      {(data && "error" in data) || error ? (
        <div className="bg-background/50 border-border/50 flex aspect-video w-full items-center justify-center rounded-lg border">
          <div className="p-8 text-center">
            <X className="mx-auto mb-3 h-12 w-12 stroke-red-500" />
            <p className="text-foreground-secondary text-sm">
              Error loading replay
            </p>
            <p className="mt-1 text-xs text-red-500">
              {data && "error" in data ? data.error : error?.message}
            </p>
          </div>
        </div>
      ) : null}

      {data && "url" in data && (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <ReactPlayer
            autoPlay
            src={data.url}
            controls
            width="100%"
            height="100%"
            style={{ aspectRatio: "16/9" }}
          />
        </div>
      )}

      {!isLoading && !data && !error && (
        <div className="bg-background/50 border-border/50 flex aspect-video w-full items-center justify-center rounded-lg border">
          <div className="p-8 text-center">
            <X className="stroke-foreground-secondary/70 mx-auto mb-3 h-12 w-12" />
            <p className="text-foreground-secondary text-sm">
              No replay available
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionObservations({
  observations,
}: {
  observations: Session["observations"];
}) {
  if (!observations || observations.length === 0) {
    return null;
  }

  return (
    <div className="border-border bg-surface rounded-lg border p-6">
      <h2 className="font-display mb-4 text-xl font-semibold">Observations</h2>
      <div className="space-y-3">
        {observations.map((obs, index) => (
          <div
            key={index}
            className="border-border/50 bg-background/50 space-y-2 rounded-lg border p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{obs.observation}</p>
              <div className="flex flex-shrink-0 gap-1">
                <Badge
                  variant={
                    obs.confidence === "high"
                      ? "default"
                      : obs.confidence === "medium"
                        ? "secondary"
                        : "outline"
                  }
                  className="text-xs"
                >
                  {obs.confidence}
                </Badge>
                <Badge
                  variant={
                    obs.urgency === "high"
                      ? "destructive"
                      : obs.urgency === "medium"
                        ? "default"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {obs.urgency}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-foreground-secondary text-sm">
                <span className="text-foreground font-medium">Why:</span>{" "}
                {obs.explanation}
              </p>
              <p className="text-foreground-secondary text-sm">
                <span className="text-foreground font-medium">Suggestion:</span>{" "}
                {obs.suggestion}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinearTickets({ tickets }: { tickets: Ticket[] }) {
  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Circle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="border-border bg-background hover:bg-surface/50 rounded-lg border p-3 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(ticket.status)}
                <h4 className="text-foreground text-sm font-medium">
                  {ticket.name}
                </h4>
              </div>

              {ticket.description && (
                <p className="text-foreground-secondary mt-1 line-clamp-2 text-xs">
                  {ticket.description}
                </p>
              )}
            </div>

            {ticket.url && (
              <Link
                href={ticket.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground-secondary hover:bg-surface hover:text-foreground ml-2 rounded p-1 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      ))}

      {tickets.length === 0 && (
        <p className="text-foreground-secondary text-center text-sm">
          No tickets linked to this session
        </p>
      )}
    </div>
  );
}

function SessionStory({ story }: { story: string | null }) {
  if (!story) {
    return (
      <div className="border-border bg-surface rounded-lg border p-6">
        <p className="text-foreground-secondary text-sm italic">
          No analysis available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-surface rounded-lg border p-6">
      <Markdown>{story}</Markdown>
    </div>
  );
}
