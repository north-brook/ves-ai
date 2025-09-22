"use client";

import { Issue } from "@/types";
import Link from "next/link";
import {
  Bug,
  MousePointer,
  TrendingUp,
  Sparkles,
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
  Play,
  Calendar,
  LoaderCircle,
  Check,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/markdown";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function IssueLine({
  issue,
  className,
  projectSlug,
}: {
  issue: Issue & {
    sessions: { id: string }[];
  };
  className?: string;
  projectSlug: string;
}) {

  // Get icon and color for issue type
  const getTypeDisplay = () => {
    switch (issue.type) {
      case "bug":
        return {
          icon: <Bug className="h-4 w-4" />,
          color: "text-red-500",
          bgColor: "bg-red-100 dark:bg-red-900/20",
        };
      case "usability":
        return {
          icon: <MousePointer className="h-4 w-4" />,
          color: "text-orange-500",
          bgColor: "bg-orange-100 dark:bg-orange-900/20",
        };
      case "improvement":
        return {
          icon: <TrendingUp className="h-4 w-4" />,
          color: "text-blue-500",
          bgColor: "bg-blue-100 dark:bg-blue-900/20",
        };
      case "feature":
        return {
          icon: <Sparkles className="h-4 w-4" />,
          color: "text-purple-500",
          bgColor: "bg-purple-100 dark:bg-purple-900/20",
        };
      default:
        return {
          icon: <Info className="h-4 w-4" />,
          color: "text-gray-500",
          bgColor: "bg-gray-100 dark:bg-gray-900/20",
        };
    }
  };

  // Get icon for severity
  const getSeverityDisplay = () => {
    switch (issue.severity) {
      case "critical":
        return {
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          label: "Critical severity",
          color: "text-red-600 dark:text-red-400",
        };
      case "high":
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          label: "High severity",
          color: "text-orange-600 dark:text-orange-400",
        };
      case "medium":
        return {
          icon: <Info className="h-3.5 w-3.5" />,
          label: "Medium severity",
          color: "text-yellow-600 dark:text-yellow-400",
        };
      case "low":
        return {
          icon: <Info className="h-3.5 w-3.5" />,
          label: "Low severity",
          color: "text-slate-600 dark:text-slate-400",
        };
      case "suggestion":
        return {
          icon: <Lightbulb className="h-3.5 w-3.5" />,
          label: "Suggestion",
          color: "text-blue-600 dark:text-blue-400",
        };
      default:
        return {
          icon: <Info className="h-3.5 w-3.5" />,
          label: issue.severity,
          color: "text-slate-600 dark:text-slate-400",
        };
    }
  };

  // Get icon for confidence
  const getConfidenceDisplay = () => {
    switch (issue.confidence) {
      case "high":
        return {
          icon: <ShieldCheck className="h-3.5 w-3.5" />,
          label: "High confidence",
        };
      case "medium":
        return {
          icon: <Shield className="h-3.5 w-3.5" />,
          label: "Medium confidence",
        };
      case "low":
        return {
          icon: <ShieldAlert className="h-3.5 w-3.5" />,
          label: "Low confidence",
        };
      default:
        return {
          icon: <Shield className="h-3.5 w-3.5" />,
          label: `${issue.confidence} confidence`,
        };
    }
  };

  // Get icon for priority
  const getPriorityDisplay = () => {
    switch (issue.priority) {
      case "immediate":
        return {
          icon: <AlertOctagon className="h-3.5 w-3.5" />,
          label: "Immediate priority",
          color: "text-red-600 dark:text-red-400",
        };
      case "high":
        return {
          icon: <Flag className="h-3.5 w-3.5" />,
          label: "High priority",
          color: "text-orange-600 dark:text-orange-400",
        };
      case "medium":
        return {
          icon: <Flag className="h-3.5 w-3.5" />,
          label: "Medium priority",
          color: "text-yellow-600 dark:text-yellow-400",
        };
      case "low":
        return {
          icon: <Clock className="h-3.5 w-3.5" />,
          label: "Low priority",
          color: "text-slate-600 dark:text-slate-400",
        };
      case "backlog":
        return {
          icon: <Archive className="h-3.5 w-3.5" />,
          label: "Backlog priority",
          color: "text-slate-500 dark:text-slate-500",
        };
      default:
        return {
          icon: <Flag className="h-3.5 w-3.5" />,
          label: issue.priority,
          color: "text-slate-600 dark:text-slate-400",
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
    <Link
      href={`/${projectSlug}/issues/${issue.id}`}
      className={cn(
        "border-border relative flex flex-col gap-3 rounded-lg border bg-slate-50 p-4 transition-all duration-200 hover:shadow-lg dark:bg-slate-900",
        className,
      )}
    >
      <h3 className="text-foreground text-lg font-semibold">
        {issue.name || (
          <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        )}
      </h3>

      {issue.story && (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          <Markdown className="line-clamp-4 leading-relaxed">
            {issue.story}
          </Markdown>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {issue.analyzed_at && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Last seen{" "}
              {formatDistanceToNow(new Date(issue.analyzed_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        )}

        {issue.type && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1",
              typeDisplay.bgColor,
            )}
          >
            <span className={typeDisplay.color}>{typeDisplay.icon}</span>
            <span
              className={cn("text-xs font-medium capitalize", typeDisplay.color)}
            >
              {issue.type}
            </span>
          </div>
        )}

        {issue.sessions && issue.sessions.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Play className="h-3 w-3" />
            {issue.sessions.length}{" "}
            {issue.sessions.length === 1 ? "session" : "sessions"}
          </Badge>
        )}

        {issue.severity && (
          <div className={cn("flex items-center gap-1", severityDisplay.color)}>
            {severityDisplay.icon}
            <span className="text-xs font-medium">{severityDisplay.label}</span>
          </div>
        )}

        {issue.priority && (
          <div className={cn("flex items-center gap-1", priorityDisplay.color)}>
            {priorityDisplay.icon}
            <span className="text-xs font-medium">{priorityDisplay.label}</span>
          </div>
        )}

        {issue.confidence && (
          <div className={cn("flex items-center gap-1")}>
            {confidenceDisplay.icon}
            <span className="text-xs font-medium">
              {confidenceDisplay.label}
            </span>
          </div>
        )}
      </div>

      {/* Status indicator in bottom-right corner */}
      <div className="absolute bottom-4 right-4">
        {getStatusIcon()}
      </div>
    </Link>
  );
}
