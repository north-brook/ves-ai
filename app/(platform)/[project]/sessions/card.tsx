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
  Users,
  Calendar,
  Check,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/markdown";
import { getVideoUrl } from "./[session]/actions";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

export default function SessionCard({
  session,
  tooltip = false,
}: {
  session: Session & {
    user: ProjectUser | null;
    group: ProjectGroup | null;
    issues: Issue[];
  };
  tooltip?: boolean;
}) {
  const params = useParams();
  const projectSlug = params.project as string;
  const [isHovered, setIsHovered] = useState(false);

  // Fetch video URL
  const { data: videoData, isLoading: videoLoading } = useQuery({
    queryKey: ["session-video", session.id],
    queryFn: () => getVideoUrl(session.id),
    enabled: !!session.video_uri,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  // Calculate score color (HSL gradient from red to green)
  const getScoreColor = (score: number, opacity: number = 1) => {
    // Hue goes from 0 (red) to 120 (green)
    const hue = (score / 100) * 120;
    return `hsl(${hue}, 70%, 50%, ${opacity} )`;
  };

  // Format duration from seconds to readable format
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

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
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
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>
        <Link
          href={`/${projectSlug}/sessions/${session.id}`}
          className="border-border relative flex cursor-pointer flex-row items-stretch overflow-hidden rounded-lg border bg-slate-50 transition-all duration-200 hover:shadow-md dark:bg-slate-900"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Left side - Video preview */}
          <div className="border-border relative h-full max-h-28 w-32 flex-shrink-0 border-r bg-white dark:bg-black">
            {videoLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoaderCircle
                  className="animate-spin text-black/50 dark:text-white/50"
                  size={24}
                />
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
                {/* Play icon overlay */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-200 dark:bg-white/30",
                    isHovered ? "opacity-0" : "opacity-100",
                  )}
                >
                  <div className="rounded-full bg-black/50 p-3 dark:bg-white/50">
                    <Play className="h-6 w-6 fill-none stroke-2 text-black dark:text-white" />
                  </div>
                </div>
              </>
            )}

            {!videoLoading && !hasVideo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="text-gray-600 dark:text-gray-400" size={24} />
              </div>
            )}
          </div>

          {/* Right side - Session info */}
          <div className="min-w-0 flex-1 p-3">
            {/* Session name */}
            <h3 className="text-foreground mb-2 line-clamp-2 text-sm leading-tight font-medium">
              {session.name || "Untitled Session"}
            </h3>

            {/* User name, date, and activity duration */}
            <div className="flex flex-col gap-1">
              <div className="flex flex-row flex-wrap gap-2">
                {session.user && (
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate">
                      {session.user.name || "Anonymous"}
                    </span>
                  </div>
                )}
                {session.session_at && (
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {formatDistanceToNow(new Date(session.session_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}
                {session.active_duration !== null && (
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                    <Activity className="h-3.5 w-3.5" />
                    <span>
                      {formatDuration(session.active_duration)} active
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Score indicator band */}
          {session.score !== null && (
            <div
              className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full"
              style={{ backgroundColor: getScoreColor(session.score) }}
            />
          )}

          {/* Status indicator in bottom-right corner */}
          <div className="absolute right-2 bottom-2">{getStatusIcon()}</div>
        </Link>
      </TooltipTrigger>

      {tooltip && (
        <TooltipContent
          hideArrow
          side="right"
          sideOffset={5}
          className="max-h-[90vh] max-w-md overflow-y-auto px-4 py-3 text-sm"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              {/* Session name */}
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {session.name || "Untitled Session"}
              </h3>

              {/* User and group info */}
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {session.user && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>{session.user.name || "Anonymous"}</span>
                  </div>
                )}
                {session.group && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>{session.group.name}</span>
                  </div>
                )}
              </div>

              {/* Features as pills */}
              {session.features && session.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {session.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Health score */}
            {session.score !== null && session.health && (
              <div
                className="rounded-md border p-2"
                style={{
                  backgroundColor: getScoreColor(session.score, 0.1),
                  borderColor: getScoreColor(session.score),
                }}
              >
                <Markdown className="line-clamp-5">{session.health}</Markdown>
              </div>
            )}

            {/* Story */}
            {session.story && (
              <Markdown className="line-clamp-[10]">{session.story}</Markdown>
            )}

            {/* Divider and attributes */}
            <div className="mt-4 border-t border-gray-200 pt-3 pb-1 dark:border-gray-700">
              <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
                {/* Date */}
                {session.session_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {format(
                        new Date(session.session_at),
                        "MMM d, yyyy 'at' h:mma",
                      )}
                    </span>
                  </div>
                )}

                {/* Total duration */}
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatDuration(session.total_duration)} total</span>
                </div>

                {/* Activity duration */}
                <div className="flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5" />
                  <span>{formatDuration(session.active_duration)} active</span>
                </div>

                {/* Video duration */}
                <div className="flex items-center gap-1">
                  <Video className="h-3.5 w-3.5" />
                  <span>{formatDuration(session.video_duration)} video</span>
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
