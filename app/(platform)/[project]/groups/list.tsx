"use client";

import { getScoreColor } from "@/lib/score";
import { Project, ProjectGroup, ProjectUser, Session } from "@/types";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import SectionNav from "../section-nav";
import useLiveGroups from "./live";

export default function GroupList({
  initialGroups,
  project,
}: {
  initialGroups: (ProjectGroup & {
    users: ProjectUser[];
    sessions: Session[];
  })[];
  project: Project;
}) {
  const groups = useLiveGroups({ projectId: project.id, initialGroups });
  const [searchQuery, setSearchQuery] = useState("");

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(groups, {
      keys: [
        { name: "name", weight: 2 },
        { name: "external_id", weight: 1 },
        { name: "group.name", weight: 1 },
        { name: "story", weight: 0.5 },
      ],
      threshold: 0.3,
      includeScore: true,
    });
  }, [groups]);

  // Perform search
  const displayGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groups;
    }

    const results = fuse.search(searchQuery);
    return results.map((result) => result.item);
  }, [searchQuery, fuse, groups]);

  return (
    <SectionNav
      name="Groups"
      search={{
        placeholder: "Search groups...",
        value: searchQuery,
        onChange: setSearchQuery,
        pending: false,
      }}
      items={displayGroups.map((group) => ({
        color: getScoreColor(group.score),
        name: group.name || "Unknown",
        muted: !group.name,
        link: `/${project.slug}/groups/${group.id}`,
      }))}
    />
  );
}
