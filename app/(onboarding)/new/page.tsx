import { Suspense } from "react";
import { StepLayout } from "../step-layout";
import {
  ProjectSetupForm,
  ProjectSetupFormSkeleton,
} from "../[project]/setup/form";
import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { titlefy } from "@/lib/slugify";
import slugify from "@/lib/slugify";

export default function NewProjectPage() {
  return (
    <StepLayout
      title="Setup Your Project"
      description="Let's get your project configured for AI-powered session analysis"
    >
      <Suspense fallback={<ProjectSetupFormSkeleton />}>
        <LoadedProjectForm />
      </Suspense>
    </StepLayout>
  );
}

async function LoadedProjectForm() {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/");
  }

  // Check if user already has a project
  const { data: existingRole } = await supabase
    .from("roles")
    .select("project:projects(*)")
    .eq("user_id", authUser.id)
    .single();

  // Extract domain from email
  const emailDomain = authUser.email?.split("@")[1] || "";
  const domainWithoutTLD = emailDomain.split(".")[0];

  const defaults = {
    domain: existingRole?.project?.domain || emailDomain,
    name: existingRole?.project?.name || titlefy(domainWithoutTLD),
    slug: existingRole?.project?.slug || slugify(domainWithoutTLD),
    image:
      existingRole?.project?.image ||
      `https://www.google.com/s2/favicons?domain=${emailDomain}&sz=128`,
  };

  return <ProjectSetupForm defaults={defaults} isNew={true} />;
}
