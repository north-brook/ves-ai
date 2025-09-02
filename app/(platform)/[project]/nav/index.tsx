import Link from "next/link";
import serverSupabase from "@/lib/supabase/server";
import { Suspense } from "react";
import NavProject from "./project";
import NavProfile from "./profile";
import NavPlan from "./plan";
import NavLinks from "./links";
import NavLogo from "./logo";
import NavWrapper from "./wrapper";
import { ChevronRight } from "lucide-react";
import { subMonths, setDate } from "date-fns";

export default async function ProjectNav() {
  return (
    <NavWrapper>
      <div className="flex w-full max-w-7xl items-center justify-between px-6 transition-all duration-300">
        <div className="flex items-center gap-2">
          <Link href="/" className="py-3">
            <NavLogo />
          </Link>

          <ChevronRight
            size={18}
            className="ml-1 stroke-slate-400 transition-all duration-300 dark:stroke-slate-600"
          />

          <Suspense fallback={<ProjectSkeleton />}>
            <LoadedProject />
          </Suspense>
          <div className="h-full opacity-0 transition-all duration-300 [nav[data-collapsed='true']_&]:opacity-100">
            <NavLinks />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Suspense fallback={<PlanSkeleton />}>
            <LoadedPlan />
          </Suspense>
          <Suspense fallback={<UserAvatarSkeleton />}>
            <LoadedUserAvatar />
          </Suspense>
        </div>
      </div>

      <div className="w-full px-6 [nav[data-collapsed='true']_&]:hidden">
        <NavLinks />
      </div>
    </NavWrapper>
  );
}

async function LoadedProject() {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: roles } = await supabase
    .from("roles")
    .select("*, projects(*)")
    .eq("user_id", authUser.id);

  const projects = roles?.map((role) => role.projects).filter(Boolean) || [];

  return <NavProject projects={projects} />;
}

async function LoadedPlan() {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: roles } = await supabase
    .from("roles")
    .select("*, project:projects(*)")
    .eq("user_id", authUser.id);

  const analyzedSessions: {
    project_id: string;
    count: number;
  }[] = await Promise.all(
    roles?.map(async (role) => {
      const currentDate = new Date();
      const startOfPeriod = setDate(
        subMonths(currentDate, 1),
        new Date(
          role.project.subscribed_at || role.project.created_at,
        ).getDate(),
      );

      const {
        count: projectAnalyzedSessionsCount,
        error: projectAnalyzedSessionsError,
      } = await supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("project_id", role.project_id)
        .eq("status", "analyzed")
        .gte("analyzed_at", startOfPeriod.toISOString());

      if (projectAnalyzedSessionsError)
        console.error(projectAnalyzedSessionsError);

      return {
        project_id: role.project_id,
        count: projectAnalyzedSessionsCount || 0,
      };
    }) || [],
  );

  const projects = roles?.map((role) => role.project).filter(Boolean) || [];

  return <NavPlan projects={projects} analyzedSessions={analyzedSessions} />;
}

async function LoadedUserAvatar() {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return <NavProfile user={user} />;
}

function ProjectSkeleton() {
  return (
    <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-50 dark:bg-slate-900" />
  );
}

function PlanSkeleton() {
  return (
    <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-50 dark:bg-slate-900" />
  );
}

function UserAvatarSkeleton() {
  return (
    <div className="h-10 w-10 animate-pulse rounded-full bg-slate-50 dark:bg-slate-900" />
  );
}
