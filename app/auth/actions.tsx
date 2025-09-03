"use server";

import serverSupabase from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthSession, AuthUser } from "@supabase/supabase-js";
import { User, Project } from "@/types";
import posthog from "@/lib/posthog/server";
import { Resend } from "resend";
import log from "@/lib/log";
import * as Sentry from "@sentry/nextjs";

export async function googleAuth(formData: FormData) {
  const supabase = await serverSupabase();

  const next = formData.get("next");

  console.log(
    "signing in with google",
    next
      ? `${process.env.NEXT_PUBLIC_URL}/auth/callback?next=${next}`
      : `${process.env.NEXT_PUBLIC_URL}/auth/callback`,
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: next
        ? `${process.env.NEXT_PUBLIC_URL}/auth/callback?next=${next}`
        : `${process.env.NEXT_PUBLIC_URL}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error(error);
    posthog.captureException(error);
    Sentry.captureException(error, {
      tags: { action: "googleAuth" },
      extra: { provider: "google" },
    });
    return { error: "Could not sign in with Google" };
  }

  if (data.url) redirect(data.url);
}

export async function syncAuth(auth: {
  authUser: AuthUser | null;
  authSession: AuthSession | null;
  next?: string | null;
}): Promise<{ error: string } | { user: User; project?: Project }> {
  const supabase = await serverSupabase();

  if (!auth.authUser?.email) return { error: "User has no email" };

  if (auth.authSession?.provider_refresh_token) {
    const { error } = await supabase.auth.updateUser({
      data: {
        refresh_token: auth.authSession.provider_refresh_token,
      },
    });
    if (error) {
      console.error(error);
      posthog.captureException(error);
      Sentry.captureException(error, {
        tags: { action: "syncAuth", step: "updateUser" },
        user: { id: auth.authUser.id, email: auth.authUser.email },
      });
      return { error: "Could not update user" };
    }
  }

  const { data: existingUser } = await supabase
    .from("users")
    .select("*, roles(project:projects(*))")
    .eq("id", auth.authUser.id)
    .single();

  let user: User | undefined;
  let project: Project | undefined;

  if (existingUser) {
    // EXISTING USER
    user = existingUser;
    project = existingUser?.roles?.[0]?.project;
  } else {
    // NEW USER

    // retrieve google user info
    const { firstName, lastName } = splitName(
      auth.authUser.user_metadata?.name,
    );
    let first_name: string | null = firstName;
    let last_name: string | null = lastName;
    let email: string | null = auth.authUser.email!.toLowerCase();
    let image: string | null = auth.authUser.user_metadata?.picture;

    if (auth.authUser?.identities?.[0]?.provider === "google") {
      try {
        // try to fetch more complete user info from google
        const response = await fetch(
          `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${auth.authSession?.provider_token}`,
        );
        if (response.ok) {
          const data = (await response.json()) as {
            email: string;
            name: string;
            given_name: string;
            family_name: string;
            picture: string;
          };
          first_name = data.given_name;
          last_name = data.family_name;
          email = data.email.toLowerCase();
          image = data.picture;
        }
      } catch {
        // couldn't get user info from google, so just use what we have
      }
    }

    // INIT USER

    // create user in db
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        id: auth.authUser.id,
        first_name,
        last_name,
        email,
        image,
      })
      .select("*")
      .single();
    if (error) {
      console.error(error);
      posthog.captureException(error);
      Sentry.captureException(error, {
        tags: { action: "syncAuth", step: "createUser" },
        extra: { email, firstName: first_name, lastName: last_name },
      });
      return { error: "Could not create user" };
    }
    user = newUser;

    // Log new user creation
    await log({
      text: `👤 New user created: ${user.email}`,
    });

    // Check for pending invitations
    if (user.email) {
      const { data: pendingRoles } = await supabase
        .from("roles")
        .select("*,project:projects(*)")
        .eq("user_email", user.email)
        .is("user_id", null);

      if (pendingRoles && pendingRoles.length > 0) {
        // User has pending invitations, link them
        for (const pendingRole of pendingRoles) {
          const { error } = await supabase
            .from("roles")
            .update({
              user_id: user.id,
              user_email: user.email,
            })
            .eq("id", pendingRole.id);
          if (error) {
            console.error(error);
            posthog.captureException(error);
            Sentry.captureException(error, {
              tags: { action: "syncAuth", step: "linkPendingRole" },
              extra: { roleId: pendingRole.id, userId: user.id },
            });
            return { error: "Could not link user to collection" };
          }
        }

        if (pendingRoles[0].project) {
          project = pendingRoles[0].project as Project;

          // Skip creating a new collection and role since user was invited
          revalidatePath("/", "layout");
        }
      }
    }

    // add user to resend audience
    if (!user.email.includes("mailslurp")) {
      const resend = new Resend(process.env.RESEND_API_KEY!);
      if (user.email) {
        resend.contacts.create({
          email: user.email,
          firstName: user.first_name!,
          lastName: user.last_name!,
          unsubscribed: false,
          audienceId: "b5d7d34a-09d1-4fdc-9148-55e4a56cc95d",
        });
      }
    }
  }

  revalidatePath("/", "layout");

  return { user, project };
}

function splitName(fullName?: string): {
  firstName: string | null;
  lastName: string | null;
} {
  const nameParts = fullName?.split(" ");
  const firstName = nameParts?.[0] ?? null;
  const lastName = nameParts?.slice(1).join(" ") ?? null;
  return { firstName, lastName };
}
