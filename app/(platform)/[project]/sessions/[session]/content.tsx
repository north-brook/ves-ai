"use client";

import { Badge } from "@/components/ui/badge";
import { Session, Issue } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { getVideoUrl } from "./actions";
import ReactPlayer from "react-player";
import { LoaderCircle, X } from "lucide-react";
import { Markdown } from "@/components/markdown";

export function SessionContent({
  session,
  issues,
}: {
  session: Session;
  issues: Issue[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        {session.video_uri && <SessionReplay sessionId={session.id} />}

        {session.story && <SessionStory story={session.story} />}

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
          {issues.length > 0 ? (
            <>{JSON.stringify(issues)}</>
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
