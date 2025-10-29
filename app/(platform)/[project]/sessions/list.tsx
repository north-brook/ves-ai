"use client";

import { getScoreColor } from "@/lib/score";
import { Issue, Project, ProjectGroup, ProjectUser, Session } from "@/types";
import { useEffect, useState, useTransition } from "react";
import SectionNav from "../section-nav";
import { searchSessions } from "./actions";
import useLiveSessions from "./live";

export default function SessionList({
  initialSessions,
  project,
}: {
  initialSessions: (Session & {
    user: ProjectUser;
    group: ProjectGroup | null;
    issues: Issue[];
  })[];
  project: Project;
}) {
  const sessions = useLiveSessions({ projectId: project.id, initialSessions });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    | (Session & {
        user: ProjectUser;
        group: ProjectGroup | null;
        issues: Issue[];
      })[]
    | null
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

  const displaySessions = searchResults || sessions;

  return (
    <SectionNav
      name="Sessions"
      search={{
        placeholder: "Search sessions...",
        value: searchQuery,
        onChange: setSearchQuery,
        pending: isPending,
      }}
      items={displaySessions.map((session) => ({
        color: getScoreColor(session.score),
        name: session.name,
        link: `/${project.slug}/sessions/${session.id}`,
      }))}
    />
  );
}
