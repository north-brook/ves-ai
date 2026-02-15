"use server";

import serverSupabase from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import log from "@/lib/log";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import InviteEmail from "@/emails/invite";
import adminSupabase from "@/lib/supabase/admin";

export async function saveProject(formData: FormData) {
  const supabase = await serverSupabase();
  const admin = adminSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "You must be logged in to save a project" };
  }

  const projectId = formData.get("projectId") as string | null;
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const domain = formData.get("domain") as string;
  let imageUrl = formData.get("image") as string;
  const imageFile = formData.get("imageFile") as File | null;
  const invitesRaw = formData.get("invites") as string;

  if (!name || !slug || !domain) {
    return { error: "Project name, slug, and domain are required" };
  }

  // If updating, check permissions
  if (projectId) {
    const { data: role } = await supabase
      .from("roles")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", authUser.id)
      .single();

    if (!role) {
      return { error: "You don't have permission to edit this project" };
    }
  } else {
    // Check if slug is already taken for new projects
    const { data: existingProject } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingProject) {
      return { error: "This project slug is already taken" };
    }
  }

  // Handle image upload if file is provided
  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${slug}/icon.${fileExt}`;

    // Upload the file
    const { error: uploadError } = await admin.storage
      .from("projects")
      .upload(fileName, imageFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Image upload error:", uploadError);
      return { error: "Could not upload image" };
    } else {
      // Get public URL
      const {
        data: { publicUrl },
      } = admin.storage.from("projects").getPublicUrl(fileName);

      imageUrl = publicUrl;
    }
  }

  let project;

  if (projectId) {
    // Update existing project
    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update({
        name,
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
        tags: { action: "saveProject", step: "updateProject" },
        extra: { projectId, name, domain },
      });
      return { error: "Could not update project" };
    }

    project = updatedProject;
  } else {
    // Create new project
    const { data: newProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        name,
        slug,
        domain,
        image:
          imageUrl ||
          `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        plan: "starter",
      })
      .select()
      .single();

    if (projectError) {
      console.error(projectError);
      Sentry.captureException(projectError, {
        tags: { action: "saveProject", step: "insertProject" },
        extra: { name, slug, domain },
      });
      return { error: "Could not create project" };
    }

    project = newProject;

    // Create role for the current user (only for new projects)
    const { error: roleError } = await admin.from("roles").insert({
      project_id: project.id,
      user_id: authUser.id,
      user_email: authUser.email!,
    });

    if (roleError) {
      console.error(roleError);
      Sentry.captureException(roleError, {
        tags: { action: "saveProject", step: "createRole" },
        extra: { projectId: project.id, userId: authUser.id },
      });
      return { error: "Could not assign you to the project" };
    }
  }

  // Get user details for invites
  const { data: userData } = await supabase
    .from("users")
    .select("first_name, last_name")
    .eq("id", authUser.id)
    .single();

  // Process invites
  if (invitesRaw) {
    const invites = invitesRaw
      .split(/[,\n]/)
      .map((email) => email.trim())
      .filter((email) => email && email !== authUser.email);

    if (invites.length > 0) {
      // Check which emails already have roles
      const { data: existingRoles } = await supabase
        .from("roles")
        .select("user_email")
        .eq("project_id", project.id)
        .in("user_email", invites);

      const existingEmails = new Set(
        existingRoles?.map((r) => r.user_email.toLowerCase()) || [],
      );

      const newInvites = invites.filter(
        (email) => !existingEmails.has(email.toLowerCase()),
      );

      if (newInvites.length > 0) {
        const roleInserts = newInvites.map((email) => ({
          project_id: project.id,
          user_email: email.toLowerCase(),
          user_id: null,
        }));

        const { error: inviteError } = await supabase
          .from("roles")
          .insert(roleInserts);

        if (inviteError) {
          console.error(inviteError);
          Sentry.captureException(inviteError, {
            tags: { action: "saveProject", step: "createInvites" },
            extra: { projectId: project.id, invites: newInvites },
          });
          // Don't return error for invites, just log it
        } else {
          // Send invite emails
          try {
            const resend = new Resend(process.env.RESEND_API_KEY!);
            const inviterName =
              userData?.first_name && userData?.last_name
                ? `${userData.first_name} ${userData.last_name}`
                : authUser.email?.split("@")[0] || "A colleague";

            await Promise.all(
              newInvites.map((email) =>
                resend.emails.send({
                  from: "VES AI <team@ves.ai>",
                  to: email,
                  subject: `You've been invited to ${project.name} on VES AI`,
                  react: InviteEmail({
                    inviterName,
                    projectName: project.name,
                  }),
                }),
              ),
            );
          } catch (emailError) {
            console.error("Failed to send invite emails:", emailError);
            // Don't fail the operation if emails fail
          }
        }
      }
    }
  }

  if (!projectId)
    await log({
      text: `🚀 New project created: ${project.name}`,
      url: project.domain,
    });

  revalidatePath("/", "layout");
  redirect(`/${project.slug}/posthog`);
}
