"use client";

import Markdown from "@/components/markdown";
import { getScoreColor } from "@/lib/score";
import { formatDuration } from "@/lib/time";
import { Session } from "@/types";
import { format, formatDistanceToNow } from "date-fns";
import { Activity, Calendar, Clock, Hourglass, Video } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SessionReplay from "../../replay";

export default function UserSessions({ sessions }: { sessions: Session[] }) {
  return (
    <div className="flex flex-col gap-4">
      {sessions.map((session) => (
        <SessionItem key={session.id} session={session} />
      ))}
    </div>
  );
}

function SessionItem({ session }: { session: Session }) {
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
      {session.video_uri ? (
        <SessionReplay
          sessionId={session.id}
          className="max-w-[300px] shrink-0"
        />
      ) : (
        <div className="flex aspect-video w-full max-w-[300px] shrink-0 flex-col items-center justify-center gap-2 rounded-lg bg-slate-100 p-4 dark:bg-slate-900">
          <Hourglass className="h-4 w-4 text-slate-400 dark:text-slate-600" />
          <span className="text-xs text-slate-400 dark:text-slate-600">
            Session awaiting analysis
          </span>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium">
          {session.name ? (
            session.name
          ) : (
            <span className="text-slate-600 italic dark:text-slate-400">
              {session.session_at
                ? format(new Date(session.session_at), "EEEE MMMM d h:mmaaa")
                : "Date unknown"}
            </span>
          )}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {session.session_at
                ? formatDistanceToNow(new Date(session.session_at), {
                    addSuffix: true,
                  })
                : "Time unknown"}
            </span>
          </div>
          {session.total_duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(session.total_duration)}</span>
            </div>
          )}
          {session.active_duration && (
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>{formatDuration(session.active_duration)}</span>
            </div>
          )}
          {session.video_duration && (
            <div className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              <span>{formatDuration(session.video_duration)}</span>
            </div>
          )}
        </div>
        {session.story && (
          <Markdown className="line-clamp-4 text-sm">{session.story}</Markdown>
        )}
      </div>
    </Link>
  );
}
