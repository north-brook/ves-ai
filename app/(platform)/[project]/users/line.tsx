"use client";

import { ProjectGroup, ProjectUser } from "@/types";
import Link from "next/link";
import {
  Building,
  Play,
  Brain,
  User,
  LoaderCircle,
  Check,
  Clock,
  X,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function UserLine({
  user,
  className,
  projectSlug,
}: {
  user: ProjectUser & {
    group: ProjectGroup | null;
    sessions: { id: string }[];
  };
  className?: string;
  projectSlug: string;
}) {

  const getScoreColor = (score: number, opacity: number = 1) => {
    const hue = (score / 100) * 120;
    return `hsl(${hue}, 70%, 50%, ${opacity})`;
  };

  const getInitial = (name: string | null) => {
    if (!name) return null;
    return name.charAt(0).toUpperCase();
  };

  // Get status icon for workflow status
  const getStatusIcon = () => {
    switch (user.status) {
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
      href={`/${projectSlug}/users/${user.id}`}
      className={cn(
        "border-border relative flex flex-col gap-3 rounded-lg border bg-slate-50 p-4 transition-all duration-200 hover:shadow-lg dark:bg-slate-900",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        {/* User Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
          {getInitial(user.name) ? (
            <span className="text-xl font-medium text-slate-700 dark:text-slate-300">
              {getInitial(user.name)}
            </span>
          ) : (
            <User className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          )}
        </div>

        {/* User Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-foreground text-lg font-semibold">
                {user.name || <span className="italic text-slate-600 dark:text-slate-400">Anonymous</span>}
              </h3>
              
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                {user.group && (
                  <div className="flex items-center gap-1">
                    <Building className="h-3.5 w-3.5" />
                    <span>{user.group.name}</span>
                  </div>
                )}
                
                {user.sessions && (
                  <div className="flex items-center gap-1">
                    <Play className="h-3.5 w-3.5" />
                    <span>
                      {user.sessions.length} {user.sessions.length === 1 ? "session" : "sessions"}
                    </span>
                  </div>
                )}

                {user.analyzed_at && (
                  <div className="flex items-center gap-1">
                    <Brain className="h-3.5 w-3.5" />
                    <span>
                      Analyzed {formatDistanceToNow(new Date(user.analyzed_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {user.score !== null && (
              <div
                className="absolute top-4 right-4 h-3 w-3 rounded-full"
                style={{ backgroundColor: getScoreColor(user.score) }}
                title={`Health score: ${user.score}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* User Story/Health */}
      {(user.story || user.health) && (
        <div className="ml-16 text-sm text-slate-600 dark:text-slate-400">
          <Markdown className="line-clamp-3 leading-relaxed">
            {user.health || user.story || ""}
          </Markdown>
        </div>
      )}

      {/* Status indicator in bottom-right corner */}
      <div className="absolute bottom-4 right-4">
        {getStatusIcon()}
      </div>

    </Link>
  );
}
