import Link from "next/link";
import SessionStatus from "./status";
import { Building, User } from "lucide-react";
import { Issue, ProjectGroup, ProjectUser, Session } from "@/types";
import { format, formatDistanceToNow } from "date-fns";
import { Activity, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SessionLine({
  projectSlug,
  session,
}: {
  projectSlug: string;
  session: Session & {
    user: ProjectUser;
    group: ProjectGroup | null;
    issues: Issue[];
  };
}) {
  return (
    <Link
      key={session.id}
      href={`/${projectSlug}/sessions/${session.id}`}
      className="hover:bg-foreground/5 block p-4 transition-colors duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-foreground font-medium">
            {session.name ? (
              session.name
            ) : (
              <span className="text-slate-600 dark:text-slate-400 italic">
                {session.session_at
                  ? format(new Date(session.session_at), "EEEE MMMM d h:mmaaa")
                  : "Date unknown"}
              </span>
            )}
          </h3>

          <div className="text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(session.total_duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>
                {formatDuration(
                  session.video_duration || session.active_duration,
                )}
              </span>
            </div>
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
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className={cn(!session.user.name && "italic")}>
                {session.user.name || "Anonymous"}
              </span>
            </div>
            {session.group && (
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                <span>{session.group.name}</span>
              </div>
            )}
          </div>
        </div>
        <SessionStatus
          session={session}
          size="md"
          showLabel={true}
          showProgress={true}
        />
      </div>
    </Link>
  );
}

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
