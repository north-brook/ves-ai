import { Suspense } from "react";
import {
  ArrowRight,
  CheckCircle,
  Activity,
  Bug,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;

  return (
    <Suspense fallback={<LoadingWelcome />}>
      <LoadedWelcome projectSlug={project} />
    </Suspense>
  );
}

async function LoadedWelcome({ projectSlug }: { projectSlug: string }) {
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
        <div className="from-accent-purple to-accent-pink mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br">
          <CheckCircle className="h-10 w-10 text-white" />
        </div>

        <h1 className="font-display mb-4 text-4xl font-bold">
          {"You're all set!"}
        </h1>

        <p className="text-foreground-secondary mx-auto mb-8 max-w-lg text-lg">
          VES is now watching your sessions. You'll start seeing AI-suggested
          bug reports, UX issues, and feature ideas in Linear within 24 hours.
        </p>
      </div>

      <div className="bg-surface/50 border-border mb-8 space-y-4 rounded-2xl border p-6 backdrop-blur-sm">
        <h2 className="font-display mb-4 text-xl font-semibold">
          What happens next:
        </h2>

        <div className="flex gap-3">
          <div className="from-accent-purple to-accent-pink flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium">Session Analysis</h3>
            <p className="text-foreground-secondary text-sm">
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
            <p className="text-foreground-secondary text-sm">
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
            <p className="text-foreground-secondary text-sm">
              Clear, prioritized tickets appear in your Linear backlog
              automatically
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Link
          href={`/${projectSlug}`}
          className="group font-display from-accent-purple via-accent-pink to-accent-orange relative rounded-lg bg-gradient-to-r p-[2px] text-lg font-semibold transition-all duration-200"
        >
          <div className="bg-background group-hover:bg-background/90 flex items-center gap-2 rounded-[6px] px-8 py-4 transition-all">
            <span className="text-foreground font-semibold">
              Go to Dashboard
            </span>
            <ArrowRight className="text-foreground h-5 w-5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <p className="text-foreground-secondary text-sm">
          You can always adjust settings from your dashboard
        </p>
      </div>
    </div>
  );
}

function LoadingWelcome() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center">
        <div className="from-accent-purple/20 to-accent-pink/20 mb-6 h-20 w-20 animate-pulse rounded-full bg-gradient-to-br" />
        <div className="bg-surface mb-4 h-10 w-48 animate-pulse rounded" />
        <div className="bg-surface mb-8 h-6 w-96 animate-pulse rounded" />
      </div>

      <div className="bg-surface/50 mb-8 h-64 w-full animate-pulse rounded-2xl" />

      <div className="flex justify-center">
        <div className="from-accent-purple/20 via-accent-pink/20 to-accent-orange/20 h-14 w-48 animate-pulse rounded-lg bg-gradient-to-r" />
      </div>
    </div>
  );
}
