"use client";

import Markdown from "@/components/markdown";
import { ProjectUser, Session } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Calendar, Hourglass } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SessionReplay from "../../replay";

export default function GroupUsers({
  users,
}: {
  users: (ProjectUser & { sessions: Session[] })[];
}) {
  const sortedUsers = [...users].sort((a, b) => {
    const dateA = a.session_at ? new Date(a.session_at).getTime() : 0;
    const dateB = b.session_at ? new Date(b.session_at).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="flex w-full flex-col gap-4">
      {sortedUsers.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}

function UserCard({ user }: { user: ProjectUser & { sessions: Session[] } }) {
  const params = useParams();

  // Sort sessions by most recent to least recent
  const sortedSessions = [...user.sessions].sort((a, b) => {
    const dateA = a.session_at ? new Date(a.session_at).getTime() : 0;
    const dateB = b.session_at ? new Date(b.session_at).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <Link
      href={`/${params.project}/users/${user.id}`}
      className="flex w-full flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 pt-3 pb-1 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Top section: User info */}
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
          {user.name || "Unknown User"}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          {user.session_at && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                Last active{" "}
                {formatDistanceToNow(new Date(user.session_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {user.story && (
        <Markdown className="line-clamp-2 text-sm">{user.story}</Markdown>
      )}

      {/* Bottom section: Horizontal scroll of sessions */}
      {sortedSessions.length > 0 && (
        <div className="flex w-full flex-row gap-4 overflow-x-auto pb-3">
          {sortedSessions.map((session) => (
            <div
              key={session.id}
              className="flex w-[240px] shrink-0 flex-col gap-1 rounded-lg"
            >
              {session.video_uri ? (
                <SessionReplay sessionId={session.id} className="w-full" />
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg bg-slate-100 p-4 dark:bg-slate-900">
                  <Hourglass className="h-4 w-4 text-slate-400 dark:text-slate-600" />
                  <span className="text-xs text-slate-400 dark:text-slate-600">
                    Session awaiting analysis
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <h4 className="line-clamp-1 text-sm font-medium">
                  {session.name}
                </h4>
                <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {session.session_at
                      ? formatDistanceToNow(new Date(session.session_at), {
                          addSuffix: true,
                        })
                      : "Time unknown"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
