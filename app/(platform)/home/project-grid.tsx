import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export async function ProjectGrid() {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/");
  }

  const { data: roles } = await supabase
    .from("roles")
    .select("*, projects(*)")
    .eq("user_id", authUser.id);

  const projects = roles?.map((role) => role.projects).filter(Boolean) || [];

  if (projects.length === 0) {
    redirect("/new");
  }

  if (projects.length === 1) {
    redirect(`/${projects[0].slug}`);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/${project.slug}`}
          className="group relative rounded-lg border border-border bg-slate-50 dark:bg-slate-900 p-6 transition-all hover:border-slate-600 dark:hover:border-slate-400 hover:shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">
                {project.name}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
                {project.domain}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-600 dark:text-slate-400 transition-transform group-hover:translate-x-1" />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              {project.plan.charAt(0).toUpperCase() + project.plan.slice(1)} Plan
            </span>
          </div>
        </Link>
      ))}

      <Link
        href="/new"
        className="group flex items-center justify-center rounded-lg border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/50 p-6 transition-all hover:border-slate-600 dark:hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
      >
        <div className="text-center">
          <div className="from-accent-purple to-accent-pink mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br">
            <ArrowRight className="h-6 w-6 text-white" />
          </div>
          <p className="font-medium text-foreground">Create New Project</p>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
            Set up a new project
          </p>
        </div>
      </Link>
    </div>
  );
}

export function ProjectGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-lg border border-border bg-slate-50 dark:bg-slate-900"
        />
      ))}
      <div className="h-32 animate-pulse rounded-lg border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/50" />
    </div>
  );
}