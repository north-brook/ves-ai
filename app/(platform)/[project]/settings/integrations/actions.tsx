"use server";

import serverSupabase from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

export async function updatePostHogSource(formData: FormData) {
  const supabase = await serverSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "You must be logged in" };
  }

  const projectId = formData.get("projectId") as string;
  const apiKey = formData.get("apiKey") as string;
  const host = formData.get("host") as string;
  const posthogProject = formData.get("posthogProject") as string;

  if (!apiKey || !host || !posthogProject) {
    return { error: "All fields are required" };
  }

  // Check permissions
  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", authUser.id)
    .single();

  if (!role) {
    return { error: "You don't have permission to update integrations" };
  }

  // Validate the API key
  try {
    const response = await fetch(`${host}/api/projects/`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return { error: "Invalid PostHog API key or host" };
    }

    const data = await response.json();
    const projectExists = data.results?.some(
      (p: { id: number | string }) => p.id.toString() === posthogProject,
    );

    if (!projectExists) {
      return { error: "PostHog project not found" };
    }
  } catch (error) {
    console.error(error);
    return { error: "Failed to validate PostHog credentials" };
  }

  // Update source
  const { error: updateError } = await supabase
    .from("sources")
    .update({
      source_key: apiKey,
      source_host: host,
      source_project: posthogProject,
      last_active_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("type", "posthog");

  if (updateError) {
    console.error(updateError);
    Sentry.captureException(updateError, {
      tags: { action: "updatePostHogSource" },
      extra: { projectId },
    });
    return { error: "Failed to update PostHog connection" };
  }

  revalidatePath(`/[project]/settings/integrations`, "page");
  return { success: true };
}

export async function disconnectPostHog(formData: FormData) {
  const supabase = await serverSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "You must be logged in" };
  }

  const projectId = formData.get("projectId") as string;

  // Check permissions
  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", authUser.id)
    .single();

  if (!role) {
    return { error: "You don't have permission to disconnect integrations" };
  }

  // Delete source
  const { error: deleteError } = await supabase
    .from("sources")
    .delete()
    .eq("project_id", projectId)
    .eq("type", "posthog");

  if (deleteError) {
    console.error(deleteError);
    Sentry.captureException(deleteError, {
      tags: { action: "disconnectPostHog" },
      extra: { projectId },
    });
    return { error: "Failed to disconnect PostHog" };
  }

  revalidatePath(`/[project]/settings/integrations`, "page");
  return { success: true };
}

export async function fetchPostHogProjects(apiKey: string, host: string) {
  try {
    const response = await fetch(`${host}/api/projects/`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return { error: "Invalid API key or host" };
    }

    const data = await response.json();
    return {
      projects:
        data.results?.map(
          (p: { id: number | string; name: string }) => ({
            id: p.id.toString(),
            name: p.name,
          }),
        ) || [],
    };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch projects" };
  }
}

export async function initiateLinearOAuth(
  projectSlug: string,
  next?: string,
) {
  const clientId = process.env.LINEAR_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_URL;
  const redirectUri = `${baseUrl}/auth/linear/callback`;

  if (!clientId) {
    throw new Error("Linear OAuth not configured - missing LINEAR_CLIENT_ID");
  }

  // Encode the next parameter in the state
  const state = next
    ? `${projectSlug}|next=${encodeURIComponent(next)}`
    : projectSlug;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read,write",
    state,
  });

  redirect(`https://linear.app/oauth/authorize?${params.toString()}`);
}

export async function updateLinearDestination(formData: FormData) {
  const supabase = await serverSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "You must be logged in" };
  }

  const projectId = formData.get("projectId") as string;
  const teamId = formData.get("teamId") as string;

  if (!teamId) {
    return { error: "Team is required" };
  }

  // Check permissions
  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", authUser.id)
    .single();

  if (!role) {
    return { error: "You don't have permission to update integrations" };
  }

  // Update destination
  const { error: updateError } = await supabase
    .from("destinations")
    .update({
      destination_team: teamId,
    })
    .eq("project_id", projectId)
    .eq("type", "linear");

  if (updateError) {
    console.error(updateError);
    Sentry.captureException(updateError, {
      tags: { action: "updateLinearDestination" },
      extra: { projectId },
    });
    return { error: "Failed to update Linear connection" };
  }

  revalidatePath(`/[project]/settings/integrations`, "page");
  return { success: true };
}

export async function disconnectLinear(formData: FormData) {
  const supabase = await serverSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "You must be logged in" };
  }

  const projectId = formData.get("projectId") as string;

  // Check permissions
  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", authUser.id)
    .single();

  if (!role) {
    return { error: "You don't have permission to disconnect integrations" };
  }

  // Delete destination
  const { error: deleteError } = await supabase
    .from("destinations")
    .delete()
    .eq("project_id", projectId)
    .eq("type", "linear");

  if (deleteError) {
    console.error(deleteError);
    Sentry.captureException(deleteError, {
      tags: { action: "disconnectLinear" },
      extra: { projectId },
    });
    return { error: "Failed to disconnect Linear" };
  }

  revalidatePath(`/[project]/settings/integrations`, "page");
  return { success: true };
}
