"use client";

import { formatDuration } from "@/lib/time";
import { ProjectGroup, ProjectUser, Session } from "@/types";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  Building2,
  Calendar,
  Clock,
  User,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function SessionHeader({
  session,
}: {
  session: Session & {
    user: ProjectUser;
    group: ProjectGroup | null;
  };
}) {
  const params = useParams();

  return (
    <div className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">
            {session.name ? (
              session.name
            ) : (
              <span className="text-slate-600 italic dark:text-slate-400">
                {session.session_at
                  ? format(new Date(session.session_at), "EEEE MMMM d h:mmaaa")
                  : "Date unknown"}
              </span>
            )}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
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
              <Link
                href={`/${params.project}/users/${session.user.id}`}
                className="hover:decoration-accent-purple flex items-center gap-1 underline decoration-slate-200 underline-offset-4 duration-300 dark:decoration-slate-800"
              >
                <User className="h-4 w-4" />
                {session.user.name ? (
                  <span>{session.user.name}</span>
                ) : (
                  <span className="italic">Anonymous</span>
                )}
              </Link>
            )}
            {session.group && (
              <Link
                href={`/${params.project}/groups/${session.group.id}`}
                className="flex items-center gap-1"
              >
                <Building2 className="h-4 w-4" />
                <span>{session.group.name}</span>
              </Link>
            )}
          </div>

          {session.features && session.features.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {session.features.map((feature, index) => (
                <span
                  key={index}
                  className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  {feature}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
