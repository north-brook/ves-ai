"use client";

import { getScoreColor } from "@/lib/score";
import clientSupabase from "@/lib/supabase/client";
import { Project, Session } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useTransition } from "react";
import SectionNav from "../section-nav";
import { searchSessions } from "./actions";

export default function SessionList({
  initialSessions,
  project,
}: {
  initialSessions: Pick<Session, "id" | "name" | "session_at" | "score">[];
  project: Project;
}) {
  const supabase = clientSupabase();
  const sessionsQuery = useQuery({
    queryKey: ["sessions", project.id],
    queryFn: async () => {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, name, session_at, score")
        .eq("project_id", project.id)
        .eq("status", "analyzed")
        .order("session_at", { ascending: false });
      return sessions;
    },
    initialData: initialSessions,
    enabled: !!project.id,
    refetchInterval: 5_000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Pick<Session, "id" | "name" | "session_at" | "score">[] | null
  >(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      startTransition(async () => {
        try {
          const results = await searchSessions(project.id, searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error("Search failed:", error);
          setSearchResults([]);
        }
      });
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, project.id]);

  const displaySessions = searchResults || sessionsQuery.data;

  return (
    <SectionNav
      name="Sessions"
      search={{
        placeholder: "Search sessions...",
        value: searchQuery,
        onChange: setSearchQuery,
        pending: isPending,
      }}
      items={displaySessions?.map((session) => ({
        color: getScoreColor(session.score),
        name: session.name,
        link: `/${project.slug}/sessions/${session.id}`,
        timestamp: session.session_at,
      }))}
    />
  );
}
