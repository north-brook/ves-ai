import { Suspense } from "react";
import { StepLayout } from "../../step-layout";
import { PostHogForm, PostHogFormSkeleton } from "./form";
import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PostHog from "@/components/posthog";
import type { Metadata } from "next";

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
    title: `Connect PostHog • ${projectName} • VES AI`,
    description: `Set up PostHog integration for ${projectName} to analyze session replays with AI.`,
  };
}

export default async function PostHogPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;

  return (
    <StepLayout
      title={
        <span className="flex items-center gap-2">
          Connect <PostHog size={32} className="inline-block" />
        </span>
      }
      description="Set up PostHog integration to analyze session replays"
      backHref={`/${project}/setup`}
    >
      <Suspense fallback={<PostHogFormSkeleton />}>
        <LoadedPostHogForm projectSlug={project} />
      </Suspense>
    </StepLayout>
  );
}

async function LoadedPostHogForm({ projectSlug }: { projectSlug: string }) {
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

  // Check if PostHog is already connected
  const { data: source } = await supabase
    .from("sources")
    .select("*")
    .eq("project_id", project.id)
    .eq("type", "posthog")
    .single();

  return <PostHogForm project={project} source={source} />;
}
