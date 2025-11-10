"use client";

import { ProjectGroup, ProjectUser, Session } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Calendar, Hourglass, Play, Users } from "lucide-react";

export default function GroupHeader({
  group,
}: {
  group: ProjectGroup & {
    users: ProjectUser[];
    sessions: Session[];
  };
}) {
  const analyzedSessions = group.sessions.filter(
    (session) => session.status === "analyzed",
  ).length;
  const awaitingSessions = group.sessions.filter(
    (session) => session.status !== "analyzed",
  ).length;

  return (
    <div className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold text-slate-800 dark:text-slate-200">
            {group.name ? group.name : <span className="italic">Unknown</span>}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {group.analyzed_at
                  ? formatDistanceToNow(new Date(group.analyzed_at), {
                      addSuffix: true,
                    })
                  : "Time unknown"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>
                {group.users.length} user
                {group.users.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Play className="h-4 w-4" />
              <span>
                {analyzedSessions} session
                {analyzedSessions !== 1 ? "s" : ""}
              </span>
            </div>
            {awaitingSessions > 0 && (
              <div className="flex items-center gap-1">
                <Hourglass className="h-4 w-4" />
                <span>
                  {awaitingSessions} session
                  {awaitingSessions !== 1 ? "s" : ""} awaiting analysis
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
