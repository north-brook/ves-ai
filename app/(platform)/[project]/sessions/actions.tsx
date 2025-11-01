"use server";

import serverSupabase from "@/lib/supabase/server";
import { Session } from "@/types";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

export async function searchSessions(
  projectId: string,
  query: string,
): Promise<Pick<Session, "id" | "name" | "session_at" | "score">[]> {
  const supabase = await serverSupabase();

  // First, get the embedding for the search query
  const { embedding } = await embed({
    model: openai.textEmbeddingModel("text-embedding-3-small"),
    value: query,
  });

  // Use the match_sessions function for vector similarity search
  const { data: matchedSessions, error: matchError } = await supabase.rpc(
    "match_sessions",
    {
      query_embedding: embedding as unknown as string,
      match_threshold: 0.5, // Adjust threshold as needed
      match_count: 50, // Limit results
      project_id: projectId,
    },
  );

  if (matchError) {
    console.error("Error matching sessions:", matchError);
    return [];
  }

  if (!matchedSessions || matchedSessions.length === 0) {
    return [];
  }

  console.log("matchedSessions", matchedSessions);

  return (
    await Promise.all(
      matchedSessions.map(async (m) => {
        const { data: session } = await supabase
          .from("sessions")
          .select("id, name, session_at, score")
          .eq("id", m.id)
          .single();
        return session;
      }),
    )
  ).filter((s) => s !== null);
}
