import { NextResponse } from "next/server";
import serverSupabase from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { LinearClient } from "@linear/sdk";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // This is the project slug
  const error = searchParams.get("error");

  if (error) {
    console.error("Linear OAuth error:", error);
    return NextResponse.redirect(
      `${origin}/${state}/linear?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/${state}/linear?error=${encodeURIComponent("Missing authorization code")}`
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://api.linear.app/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.LINEAR_CLIENT_ID!,
        client_secret: process.env.LINEAR_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_URL}/auth/linear/callback`,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Failed to exchange code for token:", errorText);
      throw new Error("Failed to get access token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info and default team using SDK
    const linearClient = new LinearClient({ accessToken });
    
    const viewer = await linearClient.viewer;
    if (!viewer) {
      throw new Error("Failed to fetch Linear user data");
    }

    const teamsData = await linearClient.teams();
    const teams = teamsData.nodes.map((team) => ({
      id: team.id,
      key: team.key,
      name: team.name,
    }));
    
    if (teams.length === 0) {
      throw new Error("No Linear teams found");
    }

    // Save token temporarily to session/database
    const supabase = await serverSupabase();
    
    // Get the project
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("slug", state)
      .single();

    if (!project) {
      throw new Error("Project not found");
    }

    // Store the token temporarily (we'll save full settings after team/project selection)
    const { data: existingDestination } = await supabase
      .from("destinations")
      .select("*")
      .eq("project_id", project.id)
      .eq("type", "linear")
      .single();

    if (existingDestination) {
      // Update with token only
      await supabase
        .from("destinations")
        .update({
          destination_token: accessToken,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", existingDestination.id);
    } else {
      // Create with token only (team/project will be selected on next screen)
      await supabase.from("destinations").insert({
        project_id: project.id,
        type: "linear",
        destination_token: accessToken,
        destination_team: teams[0].id, // Default to first team
      });
    }

    revalidatePath("/", "layout");
    // Redirect back to Linear page with success flag to show team/project selection
    return NextResponse.redirect(`${origin}/${state}/linear?success=true`);
  } catch (err) {
    console.error("Linear OAuth callback error:", err);
    Sentry.captureException(err, {
      tags: { action: "linearOAuthCallback" },
      extra: { projectSlug: state },
    });
    
    return NextResponse.redirect(
      `${origin}/${state}/linear?error=${encodeURIComponent("Failed to connect Linear")}`
    );
  }
}