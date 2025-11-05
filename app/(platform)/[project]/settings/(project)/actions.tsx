"use server";

import serverSupabase from "@/lib/supabase/server";
import adminSupabase from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

export async function updateProject(formData: FormData) {
  const supabase = await serverSupabase();
  const admin = adminSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "You must be logged in to update a project" };
  }

  const projectId = formData.get("projectId") as string;
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const domain = formData.get("domain") as string;
  let imageUrl = formData.get("image") as string;
  const imageFile = formData.get("imageFile") as File | null;

  if (!name || !slug || !domain) {
    return { error: "Project name, slug, and domain are required" };
  }

  // Check permissions
  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", authUser.id)
    .single();

  if (!role) {
    return { error: "You don't have permission to edit this project" };
  }

  // Check if new slug is already taken (if slug changed)
  const { data: existingProject } = await supabase
    .from("projects")
    .select("id, slug")
    .eq("id", projectId)
    .single();

  if (existingProject && existingProject.slug !== slug) {
    const { data: slugTaken } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .single();

    if (slugTaken) {
      return { error: "This project slug is already taken" };
    }
  }

  // Handle image upload if file is provided
  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${slug}/icon.${fileExt}`;

    const { error: uploadError } = await admin.storage
      .from("projects")
      .upload(fileName, imageFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Image upload error:", uploadError);
      Sentry.captureException(uploadError, {
        tags: { action: "updateProject", step: "uploadImage" },
        extra: { projectId, fileName },
      });
      return { error: "Could not upload image" };
    } else {
      const {
        data: { publicUrl },
      } = admin.storage.from("projects").getPublicUrl(fileName);

      imageUrl = publicUrl;
    }
  }

  // Update project
  const { data: updatedProject, error: updateError } = await supabase
    .from("projects")
    .update({
      name,
      slug,
      domain,
      image:
        imageUrl ||
        `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    })
    .eq("id", projectId)
    .select()
    .single();

  if (updateError) {
    console.error(updateError);
    Sentry.captureException(updateError, {
      tags: { action: "updateProject", step: "updateProject" },
      extra: { projectId, name, slug, domain },
    });
    return { error: "Could not update project" };
  }

  revalidatePath("/", "layout");
  redirect(`/${updatedProject.slug}/settings`);
}
