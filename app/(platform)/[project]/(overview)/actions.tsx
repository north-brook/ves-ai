"use server";

import serverSupabase from "@/lib/supabase/server";
import { Session } from "@/types";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

interface SessionWithTickets extends Session {
  ticketCount?: number;
}

export async function searchSessions(
  projectId: string,
  query: string,
): Promise<SessionWithTickets[]> {
  const supabase = await serverSupabase();

  // First, get the embedding for the search query
  const { embedding } = await embed({
    model: openai.textEmbeddingModel("text-embedding-3-small"),
    value: query,
  });

  // Use the match_sessions function for vector similarity search
  const { data: matchedSessions, error: matchError } = await supabase
    .rpc("match_sessions", {
      query_embedding: embedding as unknown as string,
      match_threshold: 0.5, // Adjust threshold as needed
      match_count: 50, // Limit results
    })
    .eq("project_id", projectId);

  if (matchError) {
    console.error("Error matching sessions:", matchError);
    return [];
  }

  if (!matchedSessions || matchedSessions.length === 0) {
    return [];
  }

  // Get full session details for matched IDs
  const sessionIds = matchedSessions.map((m: { id: string }) => m.id);

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .in("id", sessionIds)
    .order("session_at", { ascending: false });

  if (!sessions || sessions.length === 0) {
    return [];
  }

  // Add ticket count and similarity score to each session
  const sessionsWithTickets = sessions.map((session) => {
    const matchInfo = matchedSessions.find(
      (m: { id: string; similarity?: number }) => m.id === session.id,
    );
    return {
      ...session,
      similarity: matchInfo?.similarity || 0,
    };
  });

  // Sort by similarity score (highest first)
  sessionsWithTickets.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

  return sessionsWithTickets;
}

export async function triggerRunJob(projectSlug: string) {
  try {
    const supabase = await serverSupabase();

    // Get project ID from slug
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", projectSlug)
      .single();

    if (!project) {
      console.error(`❌ [SERVER ACTION] Project not found: ${projectSlug}`);
      return { success: false, error: "Project not found" };
    }

    console.log(
      `🚀 [SERVER ACTION] Triggering sync sessions job for project ${project.id}`,
    );

    // Construct the job URL
    const jobUrl = `${process.env.NEXT_PUBLIC_URL}/jobs/sync-sessions?project_id=${project.id}`;

    console.log(`🔗 [SERVER ACTION] Fetching: ${jobUrl}`);

    const response = await fetch(jobUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`❌ [SERVER ACTION] Failed to trigger sync sessions job:`, {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
        url: jobUrl,
      });
      return {
        success: false,
        error: `Failed to trigger job: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log(
      `✅ [SERVER ACTION] Successfully triggered sync sessions job for project ${project.id}`,
    );

    return { success: true, data };
  } catch (error) {
    console.error(
      `❌ [SERVER ACTION] Error triggering sync sessions job:`,
      error,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
