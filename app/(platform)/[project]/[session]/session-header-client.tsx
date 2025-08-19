"use client";

import { ArrowLeft, Calendar, Clock, Tag, Activity } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { SessionStatusBadge } from "@/components/session-status";
import { Project, Session } from "@/types";

interface SessionHeaderClientProps {
  session: Session;
  project: Project;
}

export function SessionHeaderClient({
  session,
  project,
}: SessionHeaderClientProps) {
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
      <Link
        href={`/${project.slug}`}
        className="text-foreground-secondary hover:text-foreground mb-4 inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">
            {session.name ? (
              session.name
            ) : (
              <span className="text-foreground-secondary italic">
                {session.session_at
                  ? format(new Date(session.session_at), "EEEE MMMM d h:mmaaa")
                  : "Date unknown"}
              </span>
            )}
          </h1>
          <div className="text-foreground-secondary mt-4 flex flex-wrap items-center gap-4 text-sm">
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
              <Tag className="h-4 w-4" />
              {session.tags && session.tags.length > 0 ? (
                <span>
                  {session.tags.length} tag
                  {session.tags.length !== 1 ? "s" : ""}
                </span>
              ) : (
                <span className="italic">Pending</span>
              )}
            </div>
          </div>

          {session.tags && session.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {session.tags.map((tag, index) => (
                <span
                  key={index}
                  className="from-accent-purple/10 to-accent-pink/10 text-foreground rounded-full bg-gradient-to-r px-3 py-1 text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <SessionStatusBadge session={session} size="lg" />
      </div>
    </div>
  );
}
