import { Suspense } from "react";
import { StepLayout } from "../../step-layout";
import { LinearForm, LoadingLinearForm } from "./form";
import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Linear from "@/components/linear";

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
      <Suspense fallback={<LoadingLinearForm />}>
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
  const { data: existingDestination } = await supabase
    .from("destinations")
    .select("*")
    .eq("project_id", project.id)
    .eq("type", "linear")
    .single();

  let linearData = null;

  // If we have a token, fetch Linear data
  if (existingDestination?.destination_token) {
    try {
      const response = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: existingDestination.destination_token,
        },
        body: JSON.stringify({
          query: `
            query {
              organization {
                id
                name
                teams {
                  nodes {
                    id
                    key
                    name
                  }
                }
              }
            }
          `,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        linearData = data.data;
      }
    } catch (error) {
      console.error("Failed to fetch Linear data:", error);
    }
  }

  return (
    <LinearForm
      projectSlug={projectSlug}
      existingDestination={existingDestination}
      linearData={linearData}
    />
  );
}
