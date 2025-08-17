"use server";

import serverSupabase from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import log from "@/lib/log";
import * as Sentry from "@sentry/nextjs";

export async function connectPostHog(formData: FormData) {
  const supabase = await serverSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "You must be logged in to connect PostHog" };
  }

  const projectSlug = formData.get("projectSlug") as string;
  const apiKey = formData.get("apiKey") as string;
  const host = formData.get("host") as string;
  const posthogProject = formData.get("posthogProject") as string;

  if (!apiKey || !host || !posthogProject) {
    return { error: "All fields are required" };
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

  // Validate the API key by making a test request
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
      (p: { id: number | string }) => p.id.toString() === posthogProject
    );

    if (!projectExists) {
      return { error: "PostHog project not found" };
    }
  } catch (error) {
    console.error(error);
    return { error: "Failed to validate PostHog credentials" };
  }

  // Check if source already exists
  const { data: existingSource } = await supabase
    .from("sources")
    .select("*")
    .eq("project_id", project.id)
    .eq("type", "posthog")
    .single();

  if (existingSource) {
    // Update existing source
    const { error: updateError } = await supabase
      .from("sources")
      .update({
        source_key: apiKey,
        source_host: host,
        source_project: posthogProject,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", existingSource.id);

    if (updateError) {
      console.error(updateError);
      Sentry.captureException(updateError, {
        tags: { action: "connectPostHog", step: "updateSource" },
        extra: { projectId: project.id },
      });
      return { error: "Failed to update PostHog connection" };
    }
  } else {
    // Create new source
    const { error: sourceError } = await supabase.from("sources").insert({
      project_id: project.id,
      type: "posthog",
      source_key: apiKey,
      source_host: host,
      source_project: posthogProject,
    });

    if (sourceError) {
      console.error(sourceError);
      Sentry.captureException(sourceError, {
        tags: { action: "connectPostHog", step: "createSource" },
        extra: { projectId: project.id },
      });
      return { error: "Failed to connect PostHog" };
    }
  }

  await log({
    text: `📊 PostHog connected for project: ${project.name}`,
  });

  revalidatePath("/", "layout");
  redirect(`/${project.slug}/linear`);
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
      projects: data.results?.map((p: { id: number | string; name: string }) => ({
        id: p.id.toString(),
        name: p.name,
      })) || [],
    };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch projects" };
  }
}