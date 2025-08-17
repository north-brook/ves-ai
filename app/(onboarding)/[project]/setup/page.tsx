import { Suspense } from "react";
import { StepLayout } from "../../step-layout";
import { ProjectSetupForm, LoadingProjectSetupForm } from "./form";
import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
      <Suspense fallback={<LoadingProjectSetupForm />}>
        <LoadedProjectSetupForm projectSlug={projectSlug} />
      </Suspense>
    </StepLayout>
  );
}

async function LoadedProjectSetupForm({ projectSlug }: { projectSlug: string }) {
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

  return <ProjectSetupForm defaults={defaults} projectId={project.id} isNew={false} />;
}