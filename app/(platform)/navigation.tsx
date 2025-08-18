import Link from "next/link";
import { Logo } from "@/app/(marketing)/logo";
import serverSupabase from "@/lib/supabase/server";
import { Suspense } from "react";
import { ProjectSelector } from "./project-selector";
import { UserAvatar } from "./user-avatar";

export async function Navigation() {
  return (
    <nav className="border-border bg-background/80 fixed top-0 z-50 w-full border-b backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/home">
            <Logo />
          </Link>

          <Suspense fallback={<ProjectSelectorSkeleton />}>
            <LoadedProjectSelector />
          </Suspense>
        </div>

        <div className="flex items-center gap-4">
          <Suspense fallback={<UserAvatarSkeleton />}>
            <LoadedUserAvatar />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}

async function LoadedProjectSelector() {
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

  return <ProjectSelector projects={projects} />;
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

function ProjectSelectorSkeleton() {
  return <div className="h-10 w-48 animate-pulse rounded-lg bg-surface" />;
}

function UserAvatarSkeleton() {
  return <div className="h-10 w-10 animate-pulse rounded-full bg-surface" />;
}