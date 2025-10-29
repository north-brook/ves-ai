"use client";

import { getScoreColor } from "@/lib/score";
import { Project, ProjectGroup, ProjectUser, Session } from "@/types";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import SectionNav from "../section-nav";
import useLiveUsers from "./live";

export default function UserList({
  initialUsers,
  project,
}: {
  initialUsers: (ProjectUser & {
    group: ProjectGroup | null;
    sessions: Session[];
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
    return results.map((result) => result.item);
  }, [searchQuery, fuse, users]);

  return (
    <SectionNav
      name="Users"
      search={{
        placeholder: "Search users...",
        value: searchQuery,
        onChange: setSearchQuery,
        pending: false,
      }}
      items={displayUsers.map((user) => ({
        color: getScoreColor(user.score),
        name: user.name || "Anonymous",
        muted: !user.name,
        link: `/${project.slug}/users/${user.id}`,
      }))}
    />
  );
}
