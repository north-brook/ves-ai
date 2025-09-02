"use client";

import {
  ArrowLeft,
  Calendar,
  Clock,
  Activity,
  Building,
  User,
  Video,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import SessionStatus from "@/app/(platform)/[project]/sessions/status";
import { Project, ProjectGroup, ProjectUser, Session } from "@/types";

export function SessionHeader({
  session,
  project,
}: {
  session: Session & {
    user: ProjectUser;
    group: ProjectGroup | null;
  };
  project: Project;
}) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <div className="border-border mb-8 border-b pb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">
            {session.name ? (
              session.name
            ) : (
              <span className="text-slate-600 dark:text-slate-400 italic">
                {session.session_at
                  ? format(new Date(session.session_at), "EEEE MMMM d h:mmaaa")
                  : "Date unknown"}
              </span>
            )}
          </h1>
          <div className="text-slate-600 dark:text-slate-400 mt-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {session.session_at
                  ? formatDistanceToNow(new Date(session.session_at), {
                      addSuffix: true,
                    })
                  : "Time unknown"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(session.total_duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              <span>{formatDuration(session.active_duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Video className="h-4 w-4" />
              <span>{formatDuration(session.video_duration)}</span>
            </div>
            {session.user && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{session.user.name}</span>
              </div>
            )}
            {session.group && (
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                <span>{session.group.name}</span>
              </div>
            )}
          </div>

          {session.features && session.features.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {session.features.map((feature, index) => (
                <span
                  key={index}
                  className="from-accent-purple/10 to-accent-pink/10 text-foreground rounded-full bg-gradient-to-r px-3 py-1 text-sm font-medium"
                >
                  {feature}
                </span>
              ))}
            </div>
          )}
        </div>
        <SessionStatus session={session} size="lg" />
      </div>
    </div>
  );
}
