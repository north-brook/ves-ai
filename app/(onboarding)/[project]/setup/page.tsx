import { Suspense } from "react";
import { StepLayout } from "../../step-layout";
import { ProjectSetupForm, ProjectSetupFormSkeleton } from "./form";
import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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
    title: `Project Setup • ${projectName} • VES AI`,
    description: `Configure ${projectName} settings for AI-powered session analysis.`,
  };
}

export default async function ProjectSetupPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectSlug } = await params;

  return (
    <StepLayout
      title="Setup Your Project"
      description="Let's get your project configured for AI-powered session analysis"
    >
      <Suspense fallback={<ProjectSetupFormSkeleton />}>
        <LoadedProjectSetupForm projectSlug={projectSlug} />
      </Suspense>
    </StepLayout>
  );
}

async function LoadedProjectSetupForm({
  projectSlug,
}: {
  projectSlug: string;
}) {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/");
  }

  // Get the existing project
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

  const defaults = {
    domain: project.domain,
    name: project.name,
    slug: project.slug,
    image: project.image,
  };

  return (
    <ProjectSetupForm
      defaults={defaults}
      projectId={project.id}
      isNew={false}
    />
  );
}
