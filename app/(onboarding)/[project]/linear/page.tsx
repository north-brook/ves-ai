import { Suspense } from "react";
import { StepLayout } from "../../step-layout";
import { LinearForm, LinearFormSkeleton } from "./form";
import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Linear from "@/components/linear";
import { LinearClient } from "@linear/sdk";

export default async function LinearPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;

  return (
    <StepLayout
      title={
        <span className="flex items-center gap-2">
          Connect <Linear size={32} className="inline-block" />
        </span>
      }
      description="Set up Linear integration to automatically sync tickets"
      backHref={`/${project}/posthog`}
    >
      <Suspense fallback={<LinearFormSkeleton />}>
        <LoadedLinearForm projectSlug={project} />
      </Suspense>
    </StepLayout>
  );
}

async function LoadedLinearForm({ projectSlug }: { projectSlug: string }) {
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

  // Check if Linear is already connected
  const { data: destination } = await supabase
    .from("destinations")
    .select("*")
    .eq("project_id", project.id)
    .eq("type", "linear")
    .single();

  let linearData = null;

  // If we have a token, fetch Linear data using SDK
  if (destination?.destination_token) {
    try {
      const linearClient = new LinearClient({
        accessToken: destination.destination_token,
      });

      const organization = await linearClient.organization;
      const teams = await linearClient.teams();

      if (organization) {
        linearData = {
          organization: {
            id: organization.id,
            name: organization.name,
            teams: {
              nodes: teams.nodes.map((team) => ({
                id: team.id,
                key: team.key,
                name: team.name,
              })),
            },
          },
        };
      }
    } catch (error) {
      console.error("Failed to fetch Linear data:", error);
    }
  }

  return (
    <LinearForm
      project={project}
      destination={destination}
      linearData={linearData}
    />
  );
}
