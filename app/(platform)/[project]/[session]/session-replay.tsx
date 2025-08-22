"use client";

import { useQuery } from "@tanstack/react-query";
import { getVideoUrl } from "./actions";
import ReactPlayer from "react-player";
import { LoaderCircle, X, XCircle } from "lucide-react";

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
