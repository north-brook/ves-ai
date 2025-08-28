import Link from "next/link";
import Logo from "@/app/(marketing)/logo";
import serverSupabase from "@/lib/supabase/server";
import { Suspense } from "react";
import ProjectSelector from "./project-selector";
import UserAvatar from "../user-avatar";
import PlanBadge from "./plan-badge";
import ProjectLinks from "./project-links";

export default async function ProjectNav() {
  return (
    <nav className="border-border bg-background/80 sticky top-0 z-50 flex w-full flex-col items-center justify-start border-b backdrop-blur-lg">
      <div className="flex w-full max-w-7xl items-center justify-between px-6 pt-4 pb-2">
        <div className="flex items-center gap-6">
          <Link href="/">
            <Logo />
          </Link>

          <Suspense fallback={<ProjectSkeleton />}>
            <LoadedProject />
          </Suspense>
        </div>

        <div className="flex items-center gap-4">
          <Suspense fallback={<UserAvatarSkeleton />}>
            <LoadedUserAvatar />
          </Suspense>
        </div>
      </div>

      <ProjectLinks />
    </nav>
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

  const currentDate = new Date();
  const startOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );

  const analyzedSessions: {
    project_id: string;
    video_duration: number;
  }[] = await Promise.all(
    roles?.map(async (role) => {
      const { data: projectAnalyzedSessions } = await supabase
        .from("sessions")
        .select("video_duration")
        .eq("project_id", role.project_id)
        .eq("status", "analyzed")
        .gte("analyzed_at", startOfMonth.toISOString());

      return {
        project_id: role.project_id,
        video_duration:
          projectAnalyzedSessions?.reduce(
            (acc, s) => acc + (s.video_duration || 0),
            0,
          ) || 0,
      };
    }) || [],
  );

  const projects = roles?.map((role) => role.projects).filter(Boolean) || [];

  return (
    <div className="flex items-center gap-3">
      <ProjectSelector projects={projects} />
      <PlanBadge projects={projects} analyzedSessions={analyzedSessions} />
    </div>
  );
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

  return <UserAvatar user={user} />;
}

function ProjectSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-surface h-10 w-48 animate-pulse rounded-lg" />
      <div className="bg-surface h-10 w-24 animate-pulse rounded-lg" />
    </div>
  );
}

function UserAvatarSkeleton() {
  return <div className="bg-surface h-10 w-10 animate-pulse rounded-full" />;
}
