"use client";

import { getMonthlySessionLimit } from "@/lib/limits";
import { titlefy } from "@/lib/slugify";
import { cn } from "@/lib/utils";
import { Project } from "@/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSessionsAnalyzed } from "../(overview)/live";

export default function NavPlan({
  projects,
  analyzedSessions,
}: {
  projects: Project[];
  analyzedSessions: {
    project_id: string;
    count: number;
  }[];
}) {
  const params = useParams();

  const currentProject = projects.find((p) => p.slug === params.project);

  const sessionsAnalyzed = useSessionsAnalyzed({
    projectId: currentProject?.id,
    initialSessionsAnalyzed:
      analyzedSessions?.find((s) => s.project_id === currentProject?.id)
        ?.count || 0,
  });

  const monthlyLimitSessions = getMonthlySessionLimit(
    currentProject?.plan || "starter",
  );

  const usagePercentage = Math.min(
    ((sessionsAnalyzed || 0) / monthlyLimitSessions) * 100,
    100,
  );
  const strokeDasharray = 2 * Math.PI * 7; // 7 is radius
  const strokeDashoffset =
    strokeDasharray - (strokeDasharray * usagePercentage) / 100;

  return (
    <>
      <Link
        href={`/${params.project}/plans`}
        className="flex items-center gap-2.5 rounded-md px-2 py-1 text-sm transition-all duration-300 hover:bg-slate-50 hover:dark:bg-slate-900 [nav[data-collapsed='true']_&]:gap-0 [nav[data-collapsed='true']_&]:pr-2 [nav[data-collapsed='true']_&]:pl-2"
      >
        <span className="hidden overflow-hidden font-medium whitespace-nowrap text-slate-600 transition-all duration-300 md:block dark:text-slate-400 [nav[data-collapsed='true']_&]:w-0 [nav[data-collapsed='true']_&]:opacity-0">
          {titlefy(currentProject?.plan || "starter")}
        </span>

        <span
          className={cn(
            "hidden overflow-hidden text-xs whitespace-nowrap transition-all duration-300 md:block [nav[data-collapsed='true']_&]:w-0 [nav[data-collapsed='true']_&]:opacity-0",
            usagePercentage >= 70
              ? "text-orange-500"
              : "text-slate-600 dark:text-slate-400",
          )}
        >
          {sessionsAnalyzed} / {monthlyLimitSessions}
        </span>
        <svg
          className={cn(
            "h-4 w-4 flex-shrink-0 -rotate-90 transition-all duration-300 [nav[data-collapsed='true']_&]:ml-0",
            usagePercentage >= 70
              ? "text-orange-500"
              : "text-slate-600 dark:text-slate-400",
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
