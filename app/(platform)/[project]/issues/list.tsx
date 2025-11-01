"use client";

import { getIssueScoreColor } from "@/lib/score";
import clientSupabase from "@/lib/supabase/client";
import { Issue, Project } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useTransition } from "react";
import SectionNav from "../section-nav";
import { searchIssues } from "./actions";

export default function IssueList({
  initialIssues,
  project,
}: {
  initialIssues: Pick<
    Issue,
    "id" | "name" | "created_at" | "severity" | "confidence"
  >[];
  project: Project;
}) {
  const supabase = clientSupabase();
  const issuesQuery = useQuery({
    queryKey: ["issues", project.id],
    queryFn: async () => {
      const { data: issues } = await supabase
        .from("issues")
        .select("id, name, created_at, severity, confidence")
        .eq("project_id", project.id)
        .eq("status", "analyzed")
        .order("created_at", { ascending: false });
      return issues;
    },
    initialData: initialIssues,
    enabled: !!project.id,
    refetchInterval: 5_000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    | Pick<Issue, "id" | "name" | "created_at" | "severity" | "confidence">[]
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

  const displayIssues = searchResults || issuesQuery.data;

  return (
    <SectionNav
      name="Issues"
      search={{
        placeholder: "Search issues...",
        value: searchQuery,
        onChange: setSearchQuery,
        pending: isPending,
      }}
      items={
        displayIssues?.map((issue) => ({
          color: getIssueScoreColor(issue),
          name: issue.name,
          link: `/${project.slug}/issues/${issue.id}`,
          timestamp: issue.created_at,
        })) || []
      }
    />
  );
}
