import Icon from "@/components/icons/ves";
import serverSupabase from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";
import NavProfile from "./profile";
import NavProject from "./project";
import NavUsage from "./usage";

export default async function TopBar() {
  return (
    <nav className="fixed top-0 right-0 left-0 flex h-12 flex-row items-center justify-between overflow-y-auto border-b border-slate-200 bg-slate-50 pr-4 pl-3.5 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-row items-center gap-1.5">
        <Link
          href="/"
          className="group hover:text-foreground flex items-center justify-start gap-2 text-base font-semibold text-slate-800 transition-all duration-300 dark:text-slate-200"
        >
          <Icon size={20} />
        </Link>

        <Suspense fallback={<ProjectSkeleton />}>
          <LoadedProject />
        </Suspense>
      </div>

      <div className="flex flex-row items-center gap-4">
        <Suspense fallback={<UsageSkeleton />}>
          <LoadedUsage />
        </Suspense>
        <Suspense fallback={<UserAvatarSkeleton />}>
          <LoadedUserAvatar />
        </Suspense>
      </div>
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

  const projects = roles?.map((role) => role.projects).filter(Boolean) || [];

  return <NavProject projects={projects} />;
}

async function LoadedUsage() {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: roles } = await supabase
    .from("roles")
    .select("*, project:projects(*)")
    .eq("user_id", authUser.id);

  const projects = roles?.map((role) => role.project).filter(Boolean) || [];

  return <NavUsage projects={projects} />;
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

function UsageSkeleton() {
  return (
    <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-50 dark:bg-slate-900" />
  );
}

function UserAvatarSkeleton() {
  return (
    <div className="h-10 w-10 animate-pulse rounded-full bg-slate-50 dark:bg-slate-900" />
  );
}
