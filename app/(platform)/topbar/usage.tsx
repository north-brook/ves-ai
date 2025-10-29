"use client";

import { getMonthlySessionLimit } from "@/lib/limits";
import clientSupabase from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Project, WORKING_SESSION_STATUS } from "@/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function NavUsage({ projects }: { projects: Project[] }) {
  const params = useParams();
  const supabase = clientSupabase();

  const currentProject = projects.find((p) => p.slug === params.project);

  const analyzedSessionsQuery = useQuery({
    queryKey: ["analyzed-sessions", currentProject?.id],
    queryFn: async () => {
      const { count: analyzedSessionsCount } = await supabase
        .from("sessions")
        .select("id", { count: "exact" })
        .eq("project_id", currentProject?.id!)
        .eq("status", "analyzed");

      return analyzedSessionsCount || 0;
    },
    refetchInterval: 5_000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    enabled: !!currentProject?.id,
  });

  const monthlyLimitSessions = getMonthlySessionLimit(
    currentProject?.plan || "starter",
  );

  const usagePercentage = Math.min(
    ((analyzedSessionsQuery.data || 0) / monthlyLimitSessions) * 100,
    100,
  );
  const strokeDasharray = 2 * Math.PI * 7; // 7 is radius
  const strokeDashoffset =
    strokeDasharray - (strokeDasharray * usagePercentage) / 100;

  const awaitingSessionsQuery = useQuery({
    queryKey: ["awaiting-sessions", currentProject?.id],
    queryFn: async () => {
      const { count: awaitingSessionsCount } = await supabase
        .from("sessions")
        .select("id", { count: "exact" })
        .eq("project_id", currentProject?.id!)
        .eq("status", "pending");

      return awaitingSessionsCount || 0;
    },
    refetchInterval: 5_000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    enabled: !!currentProject?.id,
  });

  const workingQuery = useQuery({
    queryKey: ["working", currentProject?.id],
    queryFn: async () => {
      const { count: workingCount } = await supabase
        .from("sessions")
        .select("id", { count: "exact" })
        .eq("project_id", currentProject?.id!)
        .in("status", WORKING_SESSION_STATUS)
        .limit(1)
        .single();

      return !!workingCount;
    },
    refetchInterval: 5_000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    enabled: !!currentProject?.id,
  });

  if (!currentProject) return null;

  return (
    <>
      <div className="flex flex-row items-center gap-4">
        <span className="text-xs text-slate-400 italic dark:text-slate-600">
          {`${awaitingSessionsQuery.data} awaiting analysis`}
        </span>
        <div className="flex flex-row items-center gap-2">
          <span
            className={cn(
              "hidden overflow-hidden text-xs whitespace-nowrap transition-all duration-300 md:block [nav[data-collapsed='true']_&]:w-0 [nav[data-collapsed='true']_&]:opacity-0",
              usagePercentage >= 70
                ? "text-orange-500"
                : "text-slate-600 dark:text-slate-400",
            )}
          >
            {analyzedSessionsQuery.isSuccess ? (
              <span className={cn(workingQuery.data && "animate-pulse")}>
                {analyzedSessionsQuery.data}
              </span>
            ) : (
              <span className="h-3 w-5 shrink-0 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
            )}{" "}
            / {monthlyLimitSessions}
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
        </div>
        <div className="rounded bg-slate-100 px-1.5 py-0.5 [font-size:10px] font-medium text-slate-500 uppercase dark:bg-slate-900 dark:text-slate-500">
          {currentProject?.plan}
        </div>
        <Link
          href={`/${params.project}/billing`}
          className="bg-background relative flex items-center justify-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-all duration-300 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          Upgrade
        </Link>
      </div>
    </>
  );
}
