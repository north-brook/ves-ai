"use client";

import { ProjectGroup, ProjectUser } from "@/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Building,
  Play,
  Brain,
  Users,
  LoaderCircle,
  Check,
  Clock,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function GroupCard({
  group,
}: {
  group: ProjectGroup & {
    users: ProjectUser[];
    sessions: { id: string }[];
  };
}) {
  const params = useParams();
  const projectSlug = params.project as string;

  const getScoreColor = (score: number) => {
    const hue = (score / 100) * 120;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const getInitial = (name: string | null) => {
    if (!name) return null;
    return name.charAt(0).toUpperCase();
  };

  // Get status icon for workflow status
  const getStatusIcon = () => {
    switch (group.status) {
      case "analyzed":
        return <Check className="h-4 w-4 text-slate-500" />;
      case "analyzing":
        return <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-slate-500" />;
      case "failed":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Link
      href={`/${projectSlug}/groups/${group.id}`}
      className="border-border block cursor-pointer rounded-lg border bg-slate-50 p-4 transition-all duration-200 hover:shadow-md dark:bg-slate-900"
    >
      <div className="flex items-start gap-3">
        {/* User Avatar */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
          {getInitial(group.name) ? (
            <span className="text-lg font-medium text-slate-700 dark:text-slate-300">
              {getInitial(group.name)}
            </span>
          ) : (
            <Building className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          )}
        </div>

        {/* User Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-foreground font-medium">
                {group.name || (
                  <span className="text-slate-600 italic dark:text-slate-400">
                    Anonymous
                  </span>
                )}
              </h3>
            </div>
            {group.score !== null && (
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: getScoreColor(group.score) }}
                title={`Health score: ${group.score}`}
              />
            )}
          </div>

          {/* Metadata */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            {group.users && (
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                <span>{group.users.length}</span>
              </div>
            )}

            {group.sessions && (
              <div className="flex items-center gap-1">
                <Play className="h-3 w-3" />
                <span>
                  {group.sessions.length}{" "}
                  {group.sessions.length === 1 ? "session" : "sessions"}
                </span>
              </div>
            )}

            {group.analyzed_at && (
              <div className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                <span>
                  Analyzed{" "}
                  {formatDistanceToNow(new Date(group.analyzed_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status indicator in bottom-right corner */}
      <div className="absolute right-2 bottom-2">{getStatusIcon()}</div>
    </Link>
  );
}
