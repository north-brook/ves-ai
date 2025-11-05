"use client";

import { getScoreColor } from "@/lib/score";
import clientSupabase from "@/lib/supabase/client";
import { Project, ProjectGroup } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Fuse from "fuse.js";
import { useState } from "react";
import SectionNav from "../section-nav";

export default function GroupList({
  initialGroups,
  project,
}: {
  initialGroups: Pick<ProjectGroup, "id" | "name" | "session_at" | "score">[];
  project: Project;
}) {
  const supabase = clientSupabase();
  const groupsQuery = useQuery({
    queryKey: ["groups", project.id],
    queryFn: async () => {
      const { data: groups } = await supabase
        .from("project_groups")
        .select("id, name, session_at, score")
        .eq("project_id", project.id)
        .eq("status", "analyzed")
        .order("session_at", { ascending: false });
      return groups;
    },
    initialData: initialGroups,
    enabled: !!project.id,
    refetchInterval: 5_000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Configure Fuse.js for fuzzy search
  const fuse = new Fuse(groupsQuery.data || [], {
    keys: [
      { name: "name", weight: 2 },
      { name: "external_id", weight: 1 },
      { name: "group.name", weight: 1 },
      { name: "story", weight: 0.5 },
    ],
    threshold: 0.3,
    includeScore: true,
  });

  // Perform search
  const displayGroups = !searchQuery.trim()
    ? groupsQuery.data || []
    : fuse.search(searchQuery).map((result) => result.item);

  return (
    <SectionNav
      name="Groups"
      loading={!displayGroups.length ? "Awaiting groups..." : undefined}
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
        tooltip: group.session_at
          ? formatDistanceToNow(new Date(group.session_at), {
              addSuffix: true,
            })
          : null,
      }))}
    />
  );
}
