"use client";

import { useState, useMemo } from "react";
import { Project, ProjectGroup, ProjectUser } from "@/types";
import { Search, LoaderCircle } from "lucide-react";
import Fuse from "fuse.js";
import UserLine from "./line";
import useLiveUsers from "./live";

export default function UserList({
  initialUsers,
  project,
}: {
  initialUsers: (ProjectUser & {
    group: ProjectGroup | null;
    sessions: { id: string }[];
  })[];
  project: Project;
}) {
  const users = useLiveUsers({ projectId: project.id, initialUsers });
  const [searchQuery, setSearchQuery] = useState("");

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(users, {
      keys: [
        { name: "name", weight: 2 },
        { name: "external_id", weight: 1 },
        { name: "group.name", weight: 1 },
        { name: "story", weight: 0.5 },
      ],
      threshold: 0.3,
      includeScore: true,
    });
  }, [users]);

  // Perform search
  const displayUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }
    
    const results = fuse.search(searchQuery);
    return results.map(result => result.item);
  }, [searchQuery, fuse, users]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-border bg-background focus:ring-accent-purple w-full rounded-lg border py-3 pr-4 pl-10 text-sm focus:ring focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-3">
        {displayUsers.length === 0 ? (
          <div className="p-8 text-center">
            {searchQuery ? (
              <p className="text-slate-600 dark:text-slate-400">
                No matching users found
              </p>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <LoaderCircle className="h-6 w-6 animate-spin text-slate-600 dark:text-slate-400" />
                <p className="text-slate-600 dark:text-slate-400">
                  Awaiting users
                </p>
              </div>
            )}
          </div>
        ) : (
          displayUsers.map((user) => (
            <UserLine
              key={user.id}
              projectSlug={project.slug}
              user={user}
            />
          ))
        )}
      </div>
    </div>
  );
}
