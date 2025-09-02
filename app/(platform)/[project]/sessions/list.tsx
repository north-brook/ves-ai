"use client";

import { useState, useEffect, useTransition } from "react";
import { Issue, Project, ProjectGroup, ProjectUser, Session } from "@/types";
import { searchSessions } from "./actions";
import { Search, LoaderCircle } from "lucide-react";
import useLiveSessions from "./live";
import SessionLine from "./line";

export function SessionList({
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
    <div className="border-border bg-slate-50 dark:bg-slate-900 rounded-lg border">
      <div className="border-border border-b p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-semibold">
            {displaySessions.length} Sessions
          </h2>

          <div className="relative flex-1 sm:w-64">
            <Search className="text-slate-600 dark:text-slate-400 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border bg-background focus:ring-accent-purple w-full rounded-lg border py-3 pr-4 pl-10 text-sm focus:ring focus:outline-none"
              disabled={isPending}
            />
            {isPending && (
              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                <div className="border-slate-600 dark:border-slate-400 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="divide-border divide-y">
        {displaySessions.length === 0 ? (
          <div className="p-8 text-center">
            {searchQuery ? (
              <p className="text-slate-600 dark:text-slate-400">
                No matching sessions found
              </p>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <LoaderCircle className="text-slate-600 dark:text-slate-400 h-6 w-6 animate-spin" />
                <p className="text-slate-600 dark:text-slate-400">Awaiting sessions</p>
              </div>
            )}
          </div>
        ) : (
          displaySessions.map((session) => (
            <SessionLine
              key={session.id}
              projectSlug={project.slug}
              session={session}
            />
          ))
        )}
      </div>
    </div>
  );
}
