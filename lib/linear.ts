import { LinearClient } from "@linear/sdk";
import serverSupabase from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

interface LinearTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

export async function refreshLinearToken(
  projectId: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const supabase = await serverSupabase();

  // Get the current tokens from the database
  const { data: destination } = await supabase
    .from("destinations")
    .select("destination_access_token, destination_refresh_token")
    .eq("project_id", projectId)
    .eq("type", "linear")
    .single();

  if (!destination?.destination_refresh_token) {
    console.error("No refresh token found for project:", projectId);
    return null;
  }

  try {
    // Refresh the token using the refresh token
    const tokenResponse = await fetch("https://api.linear.app/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: destination.destination_refresh_token,
        client_id: process.env.LINEAR_CLIENT_ID!,
        client_secret: process.env.LINEAR_CLIENT_SECRET!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Failed to refresh Linear token:", errorText);
      throw new Error("Failed to refresh Linear token");
    }

    const tokenData: LinearTokenResponse = await tokenResponse.json();

    // Update the tokens in the database
    const { error: updateError } = await supabase
      .from("destinations")
      .update({
        destination_access_token: tokenData.access_token,
        destination_refresh_token: tokenData.refresh_token,
        last_active_at: new Date().toISOString(),
      })
      .eq("project_id", projectId)
      .eq("type", "linear");

    if (updateError) {
      console.error("Failed to update tokens in database:", updateError);
      throw updateError;
    }

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token!,
    };
  } catch (error) {
    console.error("Error refreshing Linear token:", error);
    Sentry.captureException(error, {
      tags: { action: "refreshLinearToken" },
      extra: { projectId },
    });
    return null;
  }
}

export async function linear(projectId: string): Promise<LinearClient | null> {
  const supabase = await serverSupabase();

  // Get the current access token
  const { data: destination } = await supabase
    .from("destinations")
    .select("destination_access_token, destination_refresh_token")
    .eq("project_id", projectId)
    .eq("type", "linear")
    .single();

  if (!destination?.destination_access_token) {
    console.error("No Linear access token found for project:", projectId);
    return null;
  }

  // Try to use the current access token
  const linearClient = new LinearClient({
    accessToken: destination.destination_access_token,
  });

  try {
    // Test if the token is still valid
    const viewer = await linearClient.viewer;
    if (!viewer) {
      throw new Error("Token might be expired");
    }
    return linearClient;
  } catch {
    // Token might be expired, try to refresh it
    console.log("Linear token might be expired, attempting to refresh...");

    if (!destination.destination_refresh_token) {
      console.error("No refresh token available, cannot refresh");
      return null;
    }

    const refreshedTokens = await refreshLinearToken(projectId);
    if (!refreshedTokens) {
      console.error("Failed to refresh Linear token");
      return null;
    }

    // Create a new client with the refreshed token
    return new LinearClient({ accessToken: refreshedTokens.accessToken });
  }
}
