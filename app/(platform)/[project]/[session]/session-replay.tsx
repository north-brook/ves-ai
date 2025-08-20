"use client";

import { useQuery } from "@tanstack/react-query";
import { getVideoUrl } from "./actions";
import ReactPlayer from "react-player";
import { LoaderCircle } from "lucide-react";

export function SessionReplay({ sessionId }: { sessionId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["session-replay", sessionId],
    queryFn: () => getVideoUrl(sessionId),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  console.log(data);

  return (
    <div className="border-border bg-surface rounded-lg border p-6">
      <h2 className="font-display mb-4 text-xl font-semibold">
        Session Replay
      </h2>

      {isLoading && (
        <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-black/10">
          <div className="flex flex-col items-center gap-3">
            <LoaderCircle className="text-foreground-secondary h-6 w-6 animate-spin" />
            <p className="text-foreground-secondary text-sm">
              Loading video...
            </p>
          </div>
        </div>
      )}

      {(data && "error" in data) || error ? (
        <div className="bg-background/50 border-border/50 flex aspect-video w-full items-center justify-center rounded-lg border">
          <div className="p-8 text-center">
            <svg
              className="text-foreground-secondary/50 mx-auto mb-3 h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-foreground-secondary text-sm">
              Error loading video
            </p>
            <p className="text-foreground-secondary/70 mt-1 text-xs">
              {data && "error" in data ? data.error : error?.message}
            </p>
          </div>
        </div>
      ) : null}

      {data && "url" in data && (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <ReactPlayer
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
            <svg
              className="text-foreground-secondary/50 mx-auto mb-3 h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-foreground-secondary text-sm">
              No video available
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
