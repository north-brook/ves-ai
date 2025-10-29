import serverSupabase from "@/lib/supabase/server";
import { Activity, ArrowRight, Bug, Lightbulb } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ project: string }>;
}): Promise<Metadata> {
  const { project: projectSlug } = await params;
  const supabase = await serverSupabase();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("slug", projectSlug)
    .single();

  const projectName = project?.name || "Project";

  return {
    title: `Welcome • ${projectName} • VES AI`,
    description: `Welcome to VES AI. ${projectName} is now configured for AI-powered session analysis.`,
  };
}

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;

  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/");
  }

  // Get the project
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", projectSlug)
    .single();

  if (!project) {
    redirect("/new");
  }

  // Check if user has access to this project
  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", project.id)
    .eq("user_id", authUser.id)
    .single();

  if (!role) {
    redirect("/new");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <h1 className="font-display mb-4 text-4xl font-bold">
          {"You're all set!"}
        </h1>

        <p className="mx-auto mb-8 max-w-lg text-lg text-slate-600 dark:text-slate-400">
          VES is now watching your sessions. You&apos;ll start seeing
          AI-suggested bug reports, UX issues, and feature ideas.
        </p>
      </div>

      <div className="mb-8 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50">
        <h2 className="font-display mb-4 text-xl font-semibold">
          What happens next
        </h2>

        <div className="flex gap-3">
          <div className="from-accent-purple to-accent-pink flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium">Session Analysis</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              VES analyzes every PostHog session replay in real-time
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="from-accent-pink to-accent-orange flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br">
            <Bug className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium">Issue Detection</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              AI identifies bugs, UX friction points, and opportunities
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="from-accent-orange to-accent-purple flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br">
            <Lightbulb className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium">Linear Tickets</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Clear, rich tickets appear in your Linear backlog automatically
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Link
          href={`/${projectSlug}`}
          className="group font-display from-accent-purple via-accent-pink to-accent-orange relative inline-block rounded-lg bg-gradient-to-r p-[2px] text-lg font-semibold transition-all duration-200"
        >
          <div className="bg-background group-hover:bg-background/90 flex items-center gap-2 rounded-[6px] px-8 py-4 transition-all">
            <span className="text-foreground font-semibold">
              Go to Dashboard
            </span>
            <ArrowRight className="text-foreground h-5 w-5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <p className="text-sm text-slate-600 dark:text-slate-400">
          Observe session analysis live in the dashboard
        </p>
      </div>
    </div>
  );
}
