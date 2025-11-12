"use client";

import Markdown from "@/components/markdown";
import {
  getIssueConfidenceIcon,
  getIssueIcon,
  getIssuePriorityIcon,
} from "@/lib/issue";
import { getIssueScoreColor } from "@/lib/score";
import { titlefy } from "@/lib/slugify";
import { Issue } from "@/types";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createElement } from "react";

export default function SessionIssues({ issues }: { issues: Issue[] }) {
  if (!issues.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {issues.map((issue) => (
        <IssueItem key={issue.id} issue={issue} />
      ))}
    </div>
  );
}

function IssueItem({ issue }: { issue: Issue }) {
  const params = useParams();

  return (
    <Link
      href={`/${params.project}/issues/${issue.id}`}
      className="relative flex w-full flex-col items-stretch justify-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <span
        className="absolute right-3 top-3 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: getIssueScoreColor(issue) }}
      />
      <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
        {issue.name || "Unnamed Issue"}
      </h3>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1">
          {createElement(getIssueIcon(issue.type), {
            className: "h-3 w-3",
          })}
          <span>{titlefy(issue.type)}</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>{titlefy(issue.severity)}</span>
        </div>
        <div className="flex items-center gap-1">
          {createElement(getIssueConfidenceIcon(issue.confidence), {
            className: "h-3 w-3",
          })}
          <span>{titlefy(issue.confidence)} confidence</span>
        </div>
        <div className="flex items-center gap-1">
          {createElement(getIssuePriorityIcon(issue.priority), {
            className: "h-3 w-3",
          })}
          <span>{titlefy(issue.priority)} priority</span>
        </div>
      </div>
      {issue.story && (
        <Markdown className="line-clamp-4 text-sm">{issue.story}</Markdown>
      )}
    </Link>
  );
}

export function IssuesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-7 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="flex flex-col gap-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex w-full flex-row items-stretch justify-start gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="flex gap-3">
                <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-4/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
