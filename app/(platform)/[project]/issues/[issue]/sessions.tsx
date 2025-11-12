"use client";

import Markdown from "@/components/markdown";
import { getScoreColor } from "@/lib/score";
import { ProjectGroup, ProjectUser, Session } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Building2, Calendar, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SessionReplay from "../../replay";

export default function IssueSessions({
  sessions,
}: {
  sessions: (Session & {
    user: ProjectUser;
    group: ProjectGroup | null;
  })[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {sessions.map((session) => (
        <SessionItem key={session.id} session={session} />
      ))}
    </div>
  );
}

function SessionItem({
  session,
}: {
  session: Session & {
    user: ProjectUser;
    group: ProjectGroup | null;
  };
}) {
  const params = useParams();
  return (
    <Link
      href={`/${params.project}/sessions/${session.id}`}
      className="relative flex w-full flex-row items-stretch justify-start gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      {!!session.score && (
        <span
          className="absolute right-3 top-3 h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: getScoreColor(session.score) }}
        />
      )}
      {session.video_uri && (
        <SessionReplay
          sessionId={session.id}
          className="max-w-[360px] shrink-0"
        />
      )}
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium">{session.name}</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
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
          {session.user && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{session.user.name}</span>
            </div>
          )}
          {session.group && (
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span>{session.group.name}</span>
            </div>
          )}
        </div>
        {session.story && (
          <Markdown className="line-clamp-5 text-sm">{session.story}</Markdown>
        )}
      </div>
    </Link>
  );
}
