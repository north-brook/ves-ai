"use client";

import {
  getIssueConfidenceIcon,
  getIssueIcon,
  getIssuePriorityIcon,
} from "@/lib/issue";
import { titlefy } from "@/lib/slugify";
import { Issue, ProjectGroup, ProjectUser, Session } from "@/types";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, Calendar, Play } from "lucide-react";
import { createElement } from "react";

export default function IssueHeader({
  issue,
}: {
  issue: Issue & {
    sessions: (Session & {
      user: ProjectUser;
      group: ProjectGroup | null;
    })[];
  };
}) {
  const lastSeenAt = issue.sessions.sort(
    (a, b) =>
      new Date(b.session_at || 0).getTime() -
      new Date(a.session_at || 0).getTime(),
  )[0]?.session_at;

  return (
    <div className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">
            {issue.name ? (
              issue.name
            ) : (
              <span className="text-slate-600 italic dark:text-slate-400">
                {lastSeenAt
                  ? format(new Date(lastSeenAt), "EEEE MMMM d h:mmaaa")
                  : "Date unknown"}
              </span>
            )}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {lastSeenAt
                  ? formatDistanceToNow(new Date(lastSeenAt), {
                      addSuffix: true,
                    })
                  : "Time unknown"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Play className="h-4 w-4" />
              <span>
                {issue.sessions.length} session
                {issue.sessions.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {createElement(getIssueIcon(issue.type), {
                className: "h-4 w-4",
              })}
              <span>{titlefy(issue.type)}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              <span>{titlefy(issue.severity)} severity</span>
            </div>
            <div className="flex items-center gap-1">
              {createElement(getIssueConfidenceIcon(issue.confidence), {
                className: "h-4 w-4",
              })}
              <span>{titlefy(issue.confidence)} confidence</span>
            </div>
            <div className="flex items-center gap-1">
              {createElement(getIssuePriorityIcon(issue.priority), {
                className: "h-4 w-4",
              })}
              <span>{titlefy(issue.priority)} priority</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
