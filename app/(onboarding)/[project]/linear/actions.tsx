"use server";

import serverSupabase from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import log from "@/lib/log";
import * as Sentry from "@sentry/nextjs";
import { LinearClient } from "@linear/sdk";

export async function initiateLinearOAuth(projectSlug: string) {
  const clientId = process.env.LINEAR_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_URL}/auth/linear/callback`;

  if (!clientId) {
    throw new Error("Linear OAuth not configured - missing LINEAR_CLIENT_ID");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read,write",
    state: projectSlug,
  });

  redirect(`https://linear.app/oauth/authorize?${params.toString()}`);
}

export async function saveLinearSettings(formData: FormData) {
  const supabase = await serverSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "You must be logged in" };
  }

  const projectSlug = formData.get("projectSlug") as string;
  const linearTeam = formData.get("linearTeam") as string;
  const linearWorkspace = formData.get("linearWorkspace") as string;

  if (!linearTeam) {
    return { error: "Team selection is required" };
  }

  // Get the project
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", projectSlug)
    .single();

  if (!project) {
    return { error: "Project not found" };
  }

  // Update the destination with selected team and workspace
  const { error: updateError } = await supabase
    .from("destinations")
    .update({
      destination_team: linearTeam,
      destination_workspace: linearWorkspace || null,
      last_active_at: new Date().toISOString(),
    })
    .eq("project_id", project.id)
    .eq("type", "linear");

  if (updateError) {
    console.error(updateError);
    Sentry.captureException(updateError, {
      tags: { action: "saveLinearSettings" },
      extra: { projectId: project.id },
    });
    return { error: "Failed to save Linear settings" };
  }

  await log({
    text: `📋 Linear settings updated for project: ${project.name}`,
  });

  revalidatePath("/", "layout");
  redirect(`/${project.slug}/welcome`);
}

export async function connectLinear(formData: FormData) {
  const supabase = await serverSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "You must be logged in to connect Linear" };
  }

  const projectSlug = formData.get("projectSlug") as string;
  const linearToken = formData.get("linearToken") as string;
  const linearTeam = formData.get("linearTeam") as string;
  const linearProject = formData.get("linearProject") as string;

  if (!linearToken || !linearTeam) {
    return { error: "Linear API key and team are required" };
  }

  // Get the project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", projectSlug)
    .single();

  if (projectError || !project) {
    console.error(projectError);
    return { error: "Project not found" };
  }

  // Verify user has access to this project
  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", project.id)
    .eq("user_id", authUser.id)
    .single();

  if (!role) {
    return { error: "You don't have access to this project" };
  }

  // Validate the Linear API key using SDK
  try {
    const linearClient = new LinearClient({ accessToken: linearToken });

    // Verify the API key works by fetching viewer
    const viewer = await linearClient.viewer;
    if (!viewer) {
      return { error: "Invalid Linear API key" };
    }

    // Check if team exists
    const teams = await linearClient.teams();
    const teamExists = teams.nodes.some((t) => t.id === linearTeam);

    if (!teamExists) {
      return { error: "Linear team not found" };
    }
  } catch (error) {
    console.error(error);
    return { error: "Failed to validate Linear credentials" };
  }

  // Check if destination already exists
  const { data: existingDestination } = await supabase
    .from("destinations")
    .select("*")
    .eq("project_id", project.id)
    .eq("type", "linear")
    .single();

  if (existingDestination) {
    // Update existing destination
    const { error: updateError } = await supabase
      .from("destinations")
      .update({
        destination_token: linearToken,
        destination_team: linearTeam,
        destination_project: linearProject,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", existingDestination.id);

    if (updateError) {
      console.error(updateError);
      Sentry.captureException(updateError, {
        tags: { action: "connectLinear", step: "updateDestination" },
        extra: { projectId: project.id },
      });
      return { error: "Failed to update Linear connection" };
    }
  } else {
    // Create new destination
    const { error: destinationError } = await supabase
      .from("destinations")
      .insert({
        project_id: project.id,
        type: "linear",
        destination_token: linearToken,
        destination_team: linearTeam,
        destination_project: linearProject,
      });

    if (destinationError) {
      console.error(destinationError);
      Sentry.captureException(destinationError, {
        tags: { action: "connectLinear", step: "createDestination" },
        extra: { projectId: project.id },
      });
      return { error: "Failed to connect Linear" };
    }
  }

  await log({
    text: `📋 Linear connected for project: ${project.name}`,
  });

  revalidatePath("/", "layout");
  redirect(`/${project.slug}/welcome`);
}

export async function fetchLinearData(apiKey: string) {
  try {
    const linearClient = new LinearClient({ accessToken: apiKey });

    // Fetch viewer info
    const viewer = await linearClient.viewer;
    if (!viewer) {
      return { error: "Invalid API key" };
    }

    // Fetch teams with projects
    const teamsData = await linearClient.teams();
    const teams = await Promise.all(
      teamsData.nodes.map(async (team) => {
        const projects = await team.projects();
        return {
          id: team.id,
          key: team.key,
          name: team.name,
          projects: {
            nodes: projects.nodes.map((p) => ({
              id: p.id,
              name: p.name,
            })),
          },
        };
      }),
    );

    return {
      teams,
      viewer: {
        id: viewer.id,
        email: viewer.email,
        name: viewer.name,
      },
    };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch Linear data" };
  }
}
