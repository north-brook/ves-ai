"use server";

import serverSupabase from "@/lib/supabase/server";
import { Session } from "@/types";

interface SessionWithTickets extends Session {
  ticketCount?: number;
}

export async function searchSessions(
  projectId: string,
  query: string,
): Promise<SessionWithTickets[]> {
  const supabase = await serverSupabase();

  // First, get the embedding for the search query
  const embeddingResponse = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/embed`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: query }),
    },
  );

  if (!embeddingResponse.ok) {
    throw new Error("Failed to generate embedding");
  }

  const { embedding } = await embeddingResponse.json();

  // Use the match_sessions function for vector similarity search
  const { data: matchedSessions, error: matchError } = await supabase.rpc(
    "match_sessions",
    {
      query_embedding: embedding,
      match_threshold: 0.5, // Adjust threshold as needed
      match_count: 50, // Limit results
    },
  );

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
    .eq("project_id", projectId)
    .in("id", sessionIds)
    .order("session_at", { ascending: false });

  if (!sessions || sessions.length === 0) {
    return [];
  }

  // Get ticket counts for all sessions
  const { data: sessionTickets } = await supabase
    .from("session_tickets")
    .select("session_id")
    .in("session_id", sessionIds);

  // Count tickets per session
  const ticketCounts =
    sessionTickets?.reduce(
      (acc, st) => {
        acc[st.session_id] = (acc[st.session_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ) || {};

  // Add ticket count and similarity score to each session
  const sessionsWithTickets = sessions.map((session) => {
    const matchInfo = matchedSessions.find((m: { id: string; similarity?: number }) => m.id === session.id);
    return {
      ...session,
      ticketCount: ticketCounts[session.id] || 0,
      similarity: matchInfo?.similarity || 0,
    };
  });

  // Sort by similarity score (highest first)
  sessionsWithTickets.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

  return sessionsWithTickets;
}
