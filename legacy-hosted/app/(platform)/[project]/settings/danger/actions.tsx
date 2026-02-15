"use server";

import serverSupabase from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

export async function deleteProject(formData: FormData) {
  const supabase = await serverSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "You must be logged in to delete a project" };
  }

  const projectId = formData.get("projectId") as string;
  const confirmSlug = formData.get("confirmSlug") as string;

  if (!projectId || !confirmSlug) {
    return { error: "Missing required fields" };
  }

  // Check permissions
  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", authUser.id)
    .single();

  if (!role) {
    return { error: "You don't have permission to delete this project" };
  }

  // Get project to verify slug
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  if (!project) {
    return { error: "Project not found" };
  }

  // Verify slug confirmation
  if (confirmSlug !== project.slug) {
    return { error: "Project slug confirmation does not match" };
  }

  // Hard delete project (cascades will handle related records)
  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (deleteError) {
    console.error(deleteError);
    Sentry.captureException(deleteError, {
      tags: { action: "deleteProject" },
      extra: { projectId },
    });
    return { error: "Failed to delete project" };
  }

  revalidatePath("/", "layout");
  redirect("/home");
}
