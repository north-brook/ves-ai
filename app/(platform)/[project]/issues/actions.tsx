"use server";

import serverSupabase from "@/lib/supabase/server";
import { Issue, ProjectGroup, ProjectUser, Session } from "@/types";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

export async function searchIssues(
  projectId: string,
  query: string,
): Promise<
  (Issue & {
    sessions: (Session & {
      user: ProjectUser;
      group: ProjectGroup | null;
    })[];
  })[]
> {
  const supabase = await serverSupabase();

  // First, get the embedding for the search query
  const { embedding } = await embed({
    model: openai.textEmbeddingModel("text-embedding-3-small"),
    value: query,
  });

  // Use the match_issues function for vector similarity search
  const { data: matchedIssues, error: matchError } = await supabase.rpc(
    "match_issues",
    {
      query_embedding: embedding as unknown as string,
      match_threshold: 0.5, // Adjust threshold as needed
      match_count: 50, // Limit results
      project_id: projectId,
    },
  );

  if (matchError) {
    console.error("Error matching issues:", matchError);
    return [];
  }

  if (!matchedIssues || matchedIssues.length === 0) {
    return [];
  }

  console.log("matchedIssues", matchedIssues);

  return (
    await Promise.all(
      matchedIssues.map(async (m) => {
        const { data: issue } = await supabase
          .from("issues")
          .select(
            "*, sessions(*, user:project_users(*), group:project_groups(*))",
          )
          .eq("id", m.id)
          .single();
        return issue;
      }),
    )
  ).filter((i) => i !== null);
}
