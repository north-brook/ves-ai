"use client";

import clientSupabase from "@/lib/supabase/client";
import { ProjectGroup, ProjectUser, Session } from "@/types";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export default function useLiveUsers({
  projectId,
  initialUsers,
}: {
  projectId: string;
  initialUsers: (ProjectUser & {
    group: ProjectGroup | null;
    sessions: Session[];
  })[];
}) {
  const [users, setUsers] = useState<
    (ProjectUser & {
      group: ProjectGroup | null;
      sessions: Session[];
    })[]
  >(initialUsers);

  // Setup realtime subscription for users
  let channel: RealtimeChannel;
  useEffect(() => {
    console.log("🔌 Setting up realtime subscriptions for project:", projectId);
    const supabase = clientSupabase();
    // Subscribe to changes in project_users table
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
            table: "project_users",
            filter: `project_id=eq.${projectId},status=eq.analyzed`,
          },
          async (payload) => {
            console.log("📡 User change detected:", payload.eventType, payload);
            if (payload.eventType === "INSERT") {
              console.log("➕ New user inserted:", payload.new);
              const newUser = payload.new as ProjectUser;

              // get user with group and sessions
              const { data: user } = await supabase
                .from("project_users")
                .select("*, group:project_groups(*), sessions(*)")
                .eq("id", newUser.id)
                .single();

              if (!user) return;

              setUsers((prev) => {
                const updated = prev.some((u) => u.id === user.id)
                  ? prev.map((u) => (u.id === user.id ? user : u))
                  : [user, ...prev];

                return updated.sort((a, b) => {
                  const dateA = a.session_at
                    ? new Date(a.session_at).getTime()
                    : 0;
                  const dateB = b.session_at
                    ? new Date(b.session_at).getTime()
                    : 0;
                  return dateB - dateA;
                });
              });
            } else if (payload.eventType === "UPDATE") {
              console.log("✏️ User updated:", payload.new);
              const updatedUser = payload.new as ProjectUser;

              // get user with group and sessions
              const { data: user } = await supabase
                .from("project_users")
                .select("*, group:project_groups(*), sessions(*)")
                .eq("id", updatedUser.id)
                .single();

              if (!user) return;

              setUsers((prev) => {
                const updated = prev.some((u) => u.id === user.id)
                  ? prev.map((u) => (u.id === user.id ? user : u))
                  : [user, ...prev];

                // Sort by session_at descending (most recent first)
                return updated.sort((a, b) => {
                  const dateA = a.session_at
                    ? new Date(a.session_at).getTime()
                    : 0;
                  const dateB = b.session_at
                    ? new Date(b.session_at).getTime()
                    : 0;
                  return dateB - dateA;
                });
              });
            } else if (payload.eventType === "DELETE") {
              console.log("🗑️ User deleted:", payload.old);
              // Remove deleted user
              setUsers((prev) => prev.filter((u) => u.id !== payload.old.id));
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

  return users;
}
