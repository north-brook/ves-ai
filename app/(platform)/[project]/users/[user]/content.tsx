"use client";

import Markdown from "@/components/markdown";
import { ProjectGroup, ProjectUser, Session } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SessionReplay from "../../replay";

export default function UserContent({
  user,
}: {
  user: ProjectUser & {
    group: ProjectGroup | null;
    sessions: Session[];
  };
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <UserStory story={user.story} />
      <div className="flex flex-col gap-4">
        {user.sessions.map((session) => (
          <SessionSummary key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}

function UserStory({ story }: { story: string | null }) {
  if (!story) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-600 italic dark:text-slate-400">
          No analysis available yet.
        </p>
      </div>
    );
  }

  return <Markdown>{story}</Markdown>;
}

function SessionSummary({ session }: { session: Session }) {
  const params = useParams();
  return (
    <Link
      href={`/${params.project}/sessions/${session.id}`}
      className="flex w-full flex-row items-stretch justify-start gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
    >
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
        </div>
        {session.story && (
          <Markdown className="line-clamp-5 text-sm">{session.story}</Markdown>
        )}
      </div>
    </Link>
  );
}
