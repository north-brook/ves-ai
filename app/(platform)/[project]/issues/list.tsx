"use client";

import { useState, useEffect, useTransition } from "react";
import { Issue, Project } from "@/types";
import { searchIssues } from "./actions";
import { Search, LoaderCircle } from "lucide-react";
import useLiveIssues from "./live";
import IssueLine from "./line";

export default function IssueList({
  initialIssues,
  project,
}: {
  initialIssues: (Issue & {
    sessions: { id: string }[];
  })[];
  project: Project;
}) {
  const issues = useLiveIssues({ projectId: project.id, initialIssues });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    | (Issue & {
        sessions: { id: string }[];
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
    <div className="flex flex-col gap-4">
      <div className="relative w-full">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
        <input
          type="text"
          placeholder="Search issues..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-border bg-background focus:ring-accent-purple w-full rounded-lg border py-3 pr-4 pl-10 text-sm focus:ring focus:outline-none"
          disabled={isPending}
        />
        {isPending && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent dark:border-slate-400" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {displayIssues.length === 0 ? (
          <div className="p-8 text-center">
            {searchQuery ? (
              <p className="text-slate-600 dark:text-slate-400">
                No matching issues found
              </p>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <LoaderCircle className="h-6 w-6 animate-spin text-slate-600 dark:text-slate-400" />
                <p className="text-slate-600 dark:text-slate-400">
                  Awaiting issues
                </p>
              </div>
            )}
          </div>
        ) : (
          displayIssues.map((issue) => (
            <IssueLine
              key={issue.id}
              projectSlug={project.slug}
              issue={issue}
            />
          ))
        )}
      </div>
    </div>
  );
}
