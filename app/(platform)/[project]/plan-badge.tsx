"use client";

import { formatSecondsToHours, getMonthlyTimeLimit } from "@/lib/limits";
import { titlefy } from "@/lib/slugify";
import { cn } from "@/lib/utils";
import { Project } from "@/types";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PlanBadge({
  projects,
  analyzedSessions,
}: {
  projects: Project[];
  analyzedSessions: {
    project_id: string;
    video_duration: number;
  }[];
}) {
  const params = useParams();

  const currentProject = projects.find((p) => p.slug === params.project);

  if (!currentProject) return null;

  const currentSeconds =
    analyzedSessions?.reduce((acc, s) => acc + (s.video_duration || 0), 0) || 0;

  // Calculate hours remaining based on plan
  const monthlyLimitSeconds = getMonthlyTimeLimit(currentProject?.plan);

  const usagePercentage = Math.min(
    (currentSeconds / monthlyLimitSeconds) * 100,
    100,
  );
  const strokeDasharray = 2 * Math.PI * 7; // 7 is radius
  const strokeDashoffset =
    strokeDasharray - (strokeDasharray * usagePercentage) / 100;

  return (
    <>
      <Link
        href={`/${params.project}/plans`}
        className="border-border bg-background hover:bg-surface flex items-center gap-2.5 rounded-lg border py-2.5 pr-3 pl-4 text-sm transition-colors"
      >
        <span className="text-foreground-secondary font-medium">
          {titlefy(currentProject.plan)}
        </span>

        <span
          className={cn(
            "text-xs",
            usagePercentage >= 70
              ? "text-orange-500"
              : "text-foreground-secondary",
          )}
        >
          {formatSecondsToHours(currentSeconds)} /{" "}
          {formatSecondsToHours(monthlyLimitSeconds)}
        </span>
        <svg
          className={cn(
            "h-4 w-4 -rotate-90",
            usagePercentage >= 70
              ? "text-orange-500"
              : "text-foreground-secondary",
          )}
          viewBox="0 0 16 16"
        >
          <circle
            cx="8"
            cy="8"
            r="7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="opacity-20"
          />
          <circle
            cx="8"
            cy="8"
            r="7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
      </Link>
    </>
  );
}
