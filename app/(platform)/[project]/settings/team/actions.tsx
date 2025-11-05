"use server";

import serverSupabase from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import InviteEmail from "@/emails/invite";

export async function inviteTeamMember(formData: FormData) {
  const supabase = await serverSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "You must be logged in to invite team members" };
  }

  const projectId = formData.get("projectId") as string;
  const emailInput = formData.get("email") as string;

  if (!emailInput) {
    return { error: "Email is required" };
  }

  // Split by comma and trim whitespace
  const emails = emailInput
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  if (emails.length === 0) {
    return { error: "At least one email is required" };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = emails.filter((email) => !emailRegex.test(email));
  if (invalidEmails.length > 0) {
    return { error: `Invalid email address: ${invalidEmails[0]}` };
  }

  // Check permissions
  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", authUser.id)
    .single();

  if (!role) {
    return { error: "You don't have permission to invite team members" };
  }

  // Get project details
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  if (!project) {
    return { error: "Project not found" };
  }

  // Check for existing roles
  const { data: existingRoles } = await supabase
    .from("roles")
    .select("user_email")
    .eq("project_id", projectId)
    .in("user_email", emails.map((e) => e.toLowerCase()));

  const existingEmails = new Set(
    existingRoles?.map((r) => r.user_email) || [],
  );
  const newEmails = emails.filter(
    (email) => !existingEmails.has(email.toLowerCase()),
  );

  if (newEmails.length === 0) {
    return {
      error:
        emails.length === 1
          ? "This email is already invited or part of the team"
          : "All emails are already invited or part of the team",
    };
  }

  // Create roles for new emails
  const rolesToInsert = newEmails.map((email) => ({
    project_id: projectId,
    user_email: email.toLowerCase(),
    user_id: null,
  }));

  const { error: insertError } = await supabase
    .from("roles")
    .insert(rolesToInsert);

  if (insertError) {
    console.error(insertError);
    Sentry.captureException(insertError, {
      tags: { action: "inviteTeamMember", step: "insertRole" },
      extra: { projectId, emails: newEmails },
    });
    return { error: "Could not create invites" };
  }

  // Send invite emails
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);

    // Get inviter details
    const { data: userData } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", authUser.id)
      .single();

    const inviterName =
      userData?.first_name && userData?.last_name
        ? `${userData.first_name} ${userData.last_name}`
        : authUser.email?.split("@")[0] || "A colleague";

    // Send emails in parallel
    await Promise.all(
      newEmails.map((email) =>
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
    // Don't fail the operation if email fails
  }

  revalidatePath(`/[project]/settings/team`, "page");

  const skippedCount = emails.length - newEmails.length;
  if (skippedCount > 0) {
    return {
      success: true,
      message: `Invited ${newEmails.length} ${newEmails.length === 1 ? "person" : "people"}. ${skippedCount} ${skippedCount === 1 ? "email was" : "emails were"} already invited.`,
    };
  }

  return { success: true };
}

export async function removeTeamMember(formData: FormData) {
  const supabase = await serverSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "You must be logged in to remove team members" };
  }

  const projectId = formData.get("projectId") as string;
  const roleId = formData.get("roleId") as string;

  if (!roleId) {
    return { error: "Role ID is required" };
  }

  // Check permissions
  const { data: authRole } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", authUser.id)
    .single();

  if (!authRole) {
    return { error: "You don't have permission to remove team members" };
  }

  // Get the role to be removed
  const { data: roleToRemove } = await supabase
    .from("roles")
    .select("user_id")
    .eq("id", roleId)
    .eq("project_id", projectId)
    .single();

  if (!roleToRemove) {
    return { error: "Role not found" };
  }

  // Prevent removing yourself
  if (roleToRemove.user_id === authUser.id) {
    return { error: "You cannot remove yourself from the project" };
  }

  // Delete role
  const { error: deleteError } = await supabase
    .from("roles")
    .delete()
    .eq("id", roleId)
    .eq("project_id", projectId);

  if (deleteError) {
    console.error(deleteError);
    Sentry.captureException(deleteError, {
      tags: { action: "removeTeamMember", step: "deleteRole" },
      extra: { projectId, roleId },
    });
    return { error: "Could not remove team member" };
  }

  revalidatePath(`/[project]/settings/team`, "page");
  return { success: true };
}

export async function cancelInvite(formData: FormData) {
  const supabase = await serverSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: "You must be logged in to cancel invites" };
  }

  const projectId = formData.get("projectId") as string;
  const roleId = formData.get("roleId") as string;

  if (!roleId) {
    return { error: "Role ID is required" };
  }

  // Check permissions
  const { data: authRole } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", authUser.id)
    .single();

  if (!authRole) {
    return { error: "You don't have permission to cancel invites" };
  }

  // Delete role (pending invite)
  const { error: deleteError } = await supabase
    .from("roles")
    .delete()
    .eq("id", roleId)
    .eq("project_id", projectId)
    .is("user_id", null); // Only delete pending invites

  if (deleteError) {
    console.error(deleteError);
    Sentry.captureException(deleteError, {
      tags: { action: "cancelInvite", step: "deleteRole" },
      extra: { projectId, roleId },
    });
    return { error: "Could not cancel invite" };
  }

  revalidatePath(`/[project]/settings/team`, "page");
  return { success: true };
}
