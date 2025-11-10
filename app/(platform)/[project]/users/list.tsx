"use client";

import { getScoreColor } from "@/lib/score";
import clientSupabase from "@/lib/supabase/client";
import { Project, ProjectUser } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Fuse from "fuse.js";
import { useState } from "react";
import SectionNav from "../section-nav";

export default function UserList({
  initialUsers,
  project,
  initialAwaitingUsers,
}: {
  initialUsers: Pick<ProjectUser, "id" | "name" | "session_at" | "score">[];
  project: Project;
  initialAwaitingUsers: number;
}) {
  const supabase = clientSupabase();
  const usersQuery = useQuery({
    queryKey: ["users", project.id],
    queryFn: async () => {
      const { data: users } = await supabase
        .from("project_users")
        .select("id, name, session_at, score")
        .eq("project_id", project.id)
        .eq("status", "analyzed")
        .order("session_at", { ascending: false });
      return users;
    },
    initialData: initialUsers,
    enabled: !!project.id,
    refetchInterval: 5_000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  const awaitingUsersQuery = useQuery({
    queryKey: ["awaiting-users", project.id],
    queryFn: async () => {
      const { count: awaitingUsers } = await supabase
        .from("project_users")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .neq("status", "analyzed");
      return awaitingUsers || 0;
    },
    initialData: initialAwaitingUsers,
    enabled: !!project.id,
    refetchInterval: 5_000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Configure Fuse.js for fuzzy search
  const fuse = new Fuse(usersQuery.data || [], {
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
  const displayUsers = !searchQuery.trim()
    ? usersQuery.data || []
    : fuse.search(searchQuery).map((result) => result.item);

  return (
    <SectionNav
      name="Users"
      loading={!displayUsers?.length ? "Awaiting users..." : undefined}
      awaiting={
        awaitingUsersQuery.data
          ? `${awaitingUsersQuery.data} awaiting analysis`
          : undefined
      }
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
        tooltip: user.session_at
          ? formatDistanceToNow(new Date(user.session_at), {
              addSuffix: true,
            })
          : null,
      }))}
    />
  );
}
