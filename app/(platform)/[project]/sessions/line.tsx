"use client";

import { Issue, ProjectGroup, ProjectUser, Session } from "@/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactPlayer from "react-player";
import {
  Play,
  Clock,
  Activity,
  Video,
  LoaderCircle,
  User,
  Building,
  Calendar,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/markdown";
import { getVideoUrl } from "./[session]/actions";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

export default function SessionLine({
  session,
  className,
  projectSlug,
}: {
  session: Session & {
    user: ProjectUser | null;
    group: ProjectGroup | null;
    issues: Issue[];
  };
  className?: string;
  projectSlug: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const { data: videoData, isLoading: videoLoading } = useQuery({
    queryKey: ["session-video", session.id],
    queryFn: () => getVideoUrl(session.id),
    enabled: !!session.video_uri,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const getScoreColor = (score: number, opacity: number = 1) => {
    const hue = (score / 100) * 120;
    return `hsl(${hue}, 70%, 50%, ${opacity})`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const hasVideo = session.video_uri && videoData && "url" in videoData;

  // Get status icon for workflow status
  const getStatusIcon = () => {
    switch (session.status) {
      case "analyzed":
        return <Check className="h-4 w-4 text-slate-500" />;
      case "analyzing":
      case "processing":
        return <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" />;
      case "pending":
      case "processed":
        return <Clock className="h-4 w-4 text-slate-500" />;
      case "failed":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Link
      href={`/${projectSlug}/sessions/${session.id}`}
      className={cn(
        "border-border relative flex flex-row items-stretch overflow-hidden rounded-lg border bg-slate-50 transition-all duration-200 hover:shadow-lg dark:bg-slate-900",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="border-border relative h-[240px] w-[400px] shrink-0 border-r bg-black">
        {videoLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <LoaderCircle className="animate-spin text-white/50" size={24} />
          </div>
        )}

        {hasVideo && (
          <>
            <ReactPlayer
              src={videoData.url}
              playing={isHovered}
              muted
              height="100%"
              width="100%"
              playbackRate={5}
              controls={false}
              loop
              style={{
                objectFit: "contain",
              }}
            />
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-200",
                isHovered ? "opacity-0" : "opacity-100",
              )}
            >
              <div className="rounded-full bg-white/10 p-2.5">
                <Play className="h-5 w-5 stroke-white" />
              </div>
            </div>
          </>
        )}

        {!videoLoading && !hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <Video className="text-gray-600" size={24} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-foreground pr-8 text-lg font-semibold">
              {session.name || (
                <span className="text-slate-600 italic dark:text-slate-400">
                  {session.session_at
                    ? format(
                        new Date(session.session_at),
                        "EEEE, MMMM d 'at' h:mmaaa",
                      )
                    : "Untitled Session"}
                </span>
              )}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              {session.user && (
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  <span className={cn(!session.user.name && "italic")}>
                    {session.user.name || "Anonymous"}
                  </span>
                </div>
              )}
              {session.group && (
                <div className="flex items-center gap-1">
                  <Building className="h-3.5 w-3.5" />
                  <span>{session.group.name}</span>
                </div>
              )}
              {session.session_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {formatDistanceToNow(new Date(session.session_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              )}
              {session.total_duration !== null && session.total_duration !== undefined && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatDuration(session.total_duration)}</span>
                </div>
              )}
              {session.active_duration !== null && session.active_duration !== undefined && (
                <div className="flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5" />
                  <span>{formatDuration(session.active_duration)}</span>
                </div>
              )}
              {session.video_duration !== null && session.video_duration !== undefined && (
                <div className="flex items-center gap-1">
                  <Video className="h-3.5 w-3.5" />
                  <span>{formatDuration(session.video_duration)}</span>
                </div>
              )}
              {session.detected_issues &&
                session.detected_issues.length > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>
                      {session.detected_issues.length} issue
                      {session.detected_issues.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
            </div>
          </div>

          {session.score !== null && (
            <div
              className="absolute top-4 right-4 h-3 w-3 rounded-full"
              style={{ backgroundColor: getScoreColor(session.score) }}
            />
          )}

          {/* Status indicator in bottom-right corner */}
          <div className="absolute bottom-4 right-4">
            {getStatusIcon()}
          </div>
        </div>

        {session.features && session.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {session.features.slice(0, 6).map((feature, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="px-2 py-0.5 text-xs"
              >
                {feature}
              </Badge>
            ))}
            {session.features.length > 6 && (
              <Badge variant="outline" className="px-2 py-0.5 text-xs">
                +{session.features.length - 6} more
              </Badge>
            )}
          </div>
        )}

        {session.health && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <Markdown className="line-clamp-3 leading-relaxed">
              {session.health}
            </Markdown>
          </div>
        )}
      </div>
    </Link>
  );
}
