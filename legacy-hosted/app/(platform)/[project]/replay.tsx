import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, X } from "lucide-react";
import ReactPlayer from "react-player";
import { getVideoUrl } from "./actions";

export default function SessionReplay({
  sessionId,
  className,
}: {
  sessionId: string;
  className?: string;
}) {
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
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      {isLoading && (
        <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-black/10">
          <LoaderCircle className="animate-spin stroke-white" size={28} />
        </div>
      )}

      {(data && "error" in data) || error ? (
        <div className="bg-background/50 flex aspect-video w-full items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800/50">
          <div className="p-8 text-center">
            <X className="mx-auto mb-3 h-12 w-12 stroke-red-500" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
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
        <div className="bg-background/50 flex aspect-video w-full items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800/50">
          <div className="p-8 text-center">
            <X className="mx-auto mb-3 h-12 w-12 stroke-slate-600/70 dark:stroke-slate-400/70" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No replay available
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
