"use client";

import { Issue } from "@/types";
import Link from "next/link";
import {
  Bug,
  MousePointer,
  TrendingUp,
  Sparkles,
  Play,
  AlertTriangle,
  AlertCircle,
  Info,
  Lightbulb,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Flag,
  AlertOctagon,
  Clock,
  Archive,
  LoaderCircle,
  Check,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useParams } from "next/navigation";
import { Markdown } from "@/components/markdown";

export default function IssueCard({
  issue,
  tooltip = false,
}: {
  issue: Issue & {
    sessions: { id: string }[];
  };
  tooltip?: boolean;
}) {
  const params = useParams();
  const projectSlug = params.project as string;

  // Get icon and color for issue type
  const getTypeDisplay = () => {
    switch (issue.type) {
      case "bug":
        return {
          icon: <Bug className="h-4 w-4" />,
          color: "text-red-500",
        };
      case "usability":
        return {
          icon: <MousePointer className="h-4 w-4" />,
          color: "text-orange-500",
        };
      case "improvement":
        return {
          icon: <TrendingUp className="h-4 w-4" />,
          color: "text-blue-500",
        };
      case "feature":
        return {
          icon: <Sparkles className="h-4 w-4" />,
          color: "text-purple-500",
        };
      default:
        return {
          icon: <Info className="h-4 w-4" />,
          color: "text-gray-500",
        };
    }
  };

  // Get icon for severity
  const getSeverityDisplay = () => {
    const iconClass = "h-4 w-4 text-slate-600 dark:text-slate-400";
    switch (issue.severity) {
      case "critical":
        return {
          icon: <AlertTriangle className={iconClass} />,
          label: "Critical",
        };
      case "high":
        return {
          icon: <AlertCircle className={iconClass} />,
          label: "High",
        };
      case "medium":
        return {
          icon: <Info className={iconClass} />,
          label: "Medium",
        };
      case "low":
        return {
          icon: <Info className={iconClass} />,
          label: "Low",
        };
      case "suggestion":
        return {
          icon: <Lightbulb className={iconClass} />,
          label: "Suggestion",
        };
      default:
        return {
          icon: <Info className={iconClass} />,
          label: issue.severity,
        };
    }
  };

  // Get icon for confidence
  const getConfidenceDisplay = () => {
    const iconClass = "h-4 w-4 text-slate-600 dark:text-slate-400";
    switch (issue.confidence) {
      case "high":
        return {
          icon: <ShieldCheck className={iconClass} />,
          label: "High",
        };
      case "medium":
        return {
          icon: <Shield className={iconClass} />,
          label: "Medium",
        };
      case "low":
        return {
          icon: <ShieldAlert className={iconClass} />,
          label: "Low",
        };
      default:
        return {
          icon: <Shield className={iconClass} />,
          label: issue.confidence,
        };
    }
  };

  // Get icon for priority
  const getPriorityDisplay = () => {
    const iconClass = "h-4 w-4 text-slate-600 dark:text-slate-400";
    switch (issue.priority) {
      case "immediate":
        return {
          icon: <AlertOctagon className={iconClass} />,
          label: "Immediate",
        };
      case "high":
        return {
          icon: <Flag className={iconClass} />,
          label: "High",
        };
      case "medium":
        return {
          icon: <Flag className={iconClass} />,
          label: "Medium",
        };
      case "low":
        return {
          icon: <Clock className={iconClass} />,
          label: "Low",
        };
      case "backlog":
        return {
          icon: <Archive className={iconClass} />,
          label: "Backlog",
        };
      default:
        return {
          icon: <Flag className={iconClass} />,
          label: issue.priority,
        };
    }
  };

  const typeDisplay = getTypeDisplay();
  const severityDisplay = getSeverityDisplay();
  const confidenceDisplay = getConfidenceDisplay();
  const priorityDisplay = getPriorityDisplay();

  // Get status icon for workflow status
  const getStatusIcon = () => {
    switch (issue.status) {
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
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>
        <Link
          href={`/${projectSlug}/issues/${issue.id}`}
          className="border-border relative block cursor-pointer rounded-lg border bg-slate-50 p-3 transition-all duration-200 hover:shadow-md dark:bg-slate-900"
        >
          <div className="flex h-full flex-col justify-between gap-3">
            {/* Issue name */}
            <h3 className="text-foreground line-clamp-2 text-sm leading-tight font-medium">
              {issue.name || (
                <div className="space-y-1">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              )}
            </h3>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Issue type */}
              {issue.type && (
                <div className={`flex items-center gap-1 ${typeDisplay.color}`}>
                  {typeDisplay.icon}
                  <span className="capitalize">{issue.type}</span>
                </div>
              )}

              {/* Sessions count */}
              {issue.sessions && (
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                  <Play className="h-3.5 w-3.5" />
                  <span>
                    {issue.sessions.length}{" "}
                    {issue.sessions.length === 1 ? "session" : "sessions"}
                  </span>
                </div>
              )}

              {/* Severity */}
              {issue.severity && (
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                  {severityDisplay.icon}
                  <span>{severityDisplay.label}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status indicator in bottom-right corner */}
          <div className="absolute right-2 bottom-2">{getStatusIcon()}</div>
        </Link>
      </TooltipTrigger>

      {tooltip && (
        <TooltipContent
          hideArrow
          side="bottom"
          sideOffset={5}
          className="max-h-[90vh] max-w-md overflow-y-auto px-4 py-3 text-sm"
        >
          <div className="space-y-3">
            {/* Issue name */}
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {issue.name}
            </h3>

            {/* Story */}
            <Markdown className="line-clamp-[10]">{issue.story || ""}</Markdown>

            {/* Divider */}
            <div className="mt-3 border-t border-gray-200 pt-3 pb-1 dark:border-gray-700">
              {/* Attributes */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
                {/* Type */}
                <div className={`flex items-center gap-1 ${typeDisplay.color}`}>
                  {typeDisplay.icon}
                  <span className="capitalize">{issue.type}</span>
                </div>

                {/* Sessions */}
                <div className="flex items-center gap-1">
                  <Play className="h-3.5 w-3.5" />
                  <span>
                    {issue.sessions.length}{" "}
                    {issue.sessions.length === 1 ? "session" : "sessions"}
                  </span>
                </div>

                {/* Severity */}
                <div className="flex items-center gap-1">
                  {severityDisplay.icon}
                  <span>{severityDisplay.label}</span>
                </div>

                {/* Priority */}
                <div className="flex items-center gap-1">
                  {priorityDisplay.icon}
                  <span>{priorityDisplay.label}</span>
                </div>

                {/* Confidence */}
                <div className="flex items-center gap-1">
                  {confidenceDisplay.icon}
                  <span>{confidenceDisplay.label} confidence</span>
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
