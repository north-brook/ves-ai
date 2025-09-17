"use client";

import { useEffect, useState } from "react";
import { ProjectGroup, ProjectUser } from "@/types";
import clientSupabase from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export default function useLiveGroups({
  projectId,
  initialGroups,
}: {
  projectId: string;
  initialGroups: (ProjectGroup & {
    users: ProjectUser[];
    sessions: { id: string }[];
  })[];
}) {
  const [groups, setGroups] = useState<
    (ProjectGroup & {
      users: ProjectUser[];
      sessions: { id: string }[];
    })[]
  >(initialGroups);

  // Setup realtime subscription for sessions
  let channel: RealtimeChannel;
  useEffect(() => {
    console.log("🔌 Setting up realtime subscriptions for project:", projectId);
    const supabase = clientSupabase();
    // Subscribe to changes in sessions table
    // Using a simpler channel name and configuration
    const channelName = `project-${projectId}-users`;
    console.log("📡 Creating channel:", channelName);

    supabase.realtime.setAuth().then(() => {
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "project_groups",
            filter: `project_id=eq.${projectId}`,
          },
          async (payload) => {
            console.log(
              "📡 Group change detected:",
              payload.eventType,
              payload,
            );
            if (payload.eventType === "INSERT") {
              console.log("➕ New group inserted:", payload.new);
              const newGroup = payload.new as ProjectGroup;

              // get user with group and sessions
              const { data: group } = await supabase
                .from("project_groups")
                .select("*, users:project_users(*), sessions(id)")
                .eq("id", newGroup.id)
                .single();

              if (!group) return;

              setGroups((prev) => {
                const updated = prev.some((g) => g.id === group.id)
                  ? prev.map((g) => (g.id === group.id ? group : g))
                  : [group, ...prev];

                return updated.sort((a, b) => {
                  const dateA = a.created_at
                    ? new Date(a.created_at).getTime()
                    : 0;
                  const dateB = b.created_at
                    ? new Date(b.created_at).getTime()
                    : 0;
                  return dateB - dateA;
                });
              });
            } else if (payload.eventType === "UPDATE") {
              console.log("✏️ Group updated:", payload.new);
              const updatedGroup = payload.new as ProjectGroup;

              // get user with group and sessions
              const { data: group } = await supabase
                .from("project_groups")
                .select("*, users:project_users(*), sessions(id)")
                .eq("id", updatedGroup.id)
                .single();

              if (!group) return;

              setGroups((prev) => {
                const updated = prev.some((g) => g.id === group.id)
                  ? prev.map((g) => (g.id === group.id ? group : g))
                  : [group, ...prev];

                // Sort by created_at descending (most recent first)
                return updated.sort((a, b) => {
                  const dateA = a.created_at
                    ? new Date(a.created_at).getTime()
                    : 0;
                  const dateB = b.created_at
                    ? new Date(b.created_at).getTime()
                    : 0;
                  return dateB - dateA;
                });
              });
            } else if (payload.eventType === "DELETE") {
              console.log("🗑️ Group deleted:", payload.old);
              // Remove deleted user
              setGroups((prev) => prev.filter((g) => g.id !== payload.old.id));
            }
          },
        )
        .subscribe((status, error) => {
          console.log("📻 Subscription status:", status, "Error:", error);
          if (status === "SUBSCRIBED") {
            console.log("✅ Successfully subscribed to realtime updates");
            console.log("📋 Channel details:", {
              channel: channel.topic,
              state: channel.state,
              params: channel.params,
            });
          } else if (status === "CHANNEL_ERROR") {
            console.error("❌ Error subscribing to realtime updates");
            console.error("🔍 Error details:", {
              error: error,
              channel: channel.topic,
              state: channel.state,
              params: channel.params,
              socket: channel.socket?.isConnected()
                ? "connected"
                : "disconnected",
            });
            // Log the actual postgres_changes subscriptions
            console.error(
              "🔍 Postgres changes subscriptions:",
              channel.bindings,
            );
          } else if (status === "TIMED_OUT") {
            console.error("⏰ Subscription timed out");
            console.error("🔍 Timeout details:", {
              channel: channel.topic,
              state: channel.state,
              socket: channel.socket?.isConnected()
                ? "connected"
                : "disconnected",
            });
          } else if (status === "CLOSED") {
            console.log("🔚 Channel closed");
          }
        });
    });

    return () => {
      console.log(
        "🔌 Cleaning up realtime subscription for channel:",
        channelName,
      );
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  return groups;
}
