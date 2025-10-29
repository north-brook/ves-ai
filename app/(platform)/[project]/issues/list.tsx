"use client";

import { getIssueScoreColor } from "@/lib/score";
import { Issue, Project, ProjectGroup, ProjectUser, Session } from "@/types";
import { useEffect, useState, useTransition } from "react";
import SectionNav from "../section-nav";
import { searchIssues } from "./actions";
import useLiveIssues from "./live";

export default function IssueList({
  initialIssues,
  project,
}: {
  initialIssues: (Issue & {
    sessions: (Session & {
      user: ProjectUser;
      group: ProjectGroup | null;
    })[];
  })[];
  project: Project;
}) {
  const issues = useLiveIssues({ projectId: project.id, initialIssues });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    | (Issue & {
        sessions: (Session & {
          user: ProjectUser;
          group: ProjectGroup | null;
        })[];
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
          const results = await searchIssues(project.id, searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error("Search failed:", error);
          setSearchResults([]);
        }
      });
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, project.id]);

  const displayIssues = searchResults || issues;

  return (
    <SectionNav
      name="Issues"
      search={{
        placeholder: "Search issues...",
        value: searchQuery,
        onChange: setSearchQuery,
        pending: isPending,
      }}
      items={displayIssues.map((issue) => ({
        color: getIssueScoreColor(issue),
        name: issue.name,
        link: `/${project.slug}/issues/${issue.id}`,
      }))}
    />
  );
}
