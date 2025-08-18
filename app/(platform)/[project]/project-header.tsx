import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlanBadge } from "@/components/plan-badge";

export async function ProjectHeader({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();
  
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", projectSlug)
    .single();

  if (!project) {
    redirect("/home");
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{project.name}</h1>
        <PlanBadge plan={project.plan} size="md" />
      </div>
      <p className="text-foreground-secondary mt-2">
        Monitor your session analysis and insights
      </p>
    </div>
  );
}

export function ProjectHeaderSkeleton() {
  return (
    <div className="mb-8">
      <div className="h-9 w-64 animate-pulse rounded bg-surface-secondary" />
      <div className="mt-2 h-5 w-96 animate-pulse rounded bg-surface-secondary" />
    </div>
  );
}