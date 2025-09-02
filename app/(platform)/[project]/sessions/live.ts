"use client";

import { useEffect, useState } from "react";
import { Issue, ProjectGroup, ProjectUser, Session } from "@/types";
import clientSupabase from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export default function useLiveSessions({
  projectId,
  initialSessions,
}: {
  projectId: string;
  initialSessions: (Session & {
    user: ProjectUser;
    group: ProjectGroup | null;
    issues: Issue[];
  })[];
}) {
  const [sessions, setSessions] = useState<
    (Session & {
      user: ProjectUser;
      group: ProjectGroup | null;
      issues: Issue[];
    })[]
  >(initialSessions);

  // Setup realtime subscription for sessions
  let channel: RealtimeChannel;
  useEffect(() => {
    console.log("🔌 Setting up realtime subscriptions for project:", projectId);
    const supabase = clientSupabase();
    // Subscribe to changes in sessions table
    // Using a simpler channel name and configuration
    const channelName = `project-${projectId}-sessions`;
    console.log("📡 Creating channel:", channelName);

    supabase.realtime.setAuth().then(() => {
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "sessions",
            filter: `project_id=eq.${projectId}`,
          },
          async (payload) => {
            console.log(
              "📡 Session change detected:",
              payload.eventType,
              payload,
            );
            if (payload.eventType === "INSERT") {
              console.log("➕ New session inserted:", payload.new);
              const newSession = payload.new as Session;

              // get session user, group, and issues
              const { data: session } = await supabase
                .from("sessions")
                .select(
                  "*, user:project_users(*), group:project_groups(*), issues:issues(*)",
                )
                .eq("id", newSession.id)
                .single();

              if (!session) return;

              setSessions((prev) => {
                const updated = prev.some((s) => s.id === session.id)
                  ? prev.map((s) => (s.id === session.id ? session : s))
                  : [session, ...prev];

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
              console.log("✏️ Session updated:", payload.new);
              const updatedSession = payload.new as Session;

              // get session user, group, and issues
              const { data: session } = await supabase
                .from("sessions")
                .select(
                  "*, user:project_users(*), group:project_groups(*), issues:issues(*)",
                )
                .eq("id", updatedSession.id)
                .single();

              if (!session) return;

              setSessions((prev) => {
                const updated = prev.some((s) => s.id === session.id)
                  ? prev.map((s) => (s.id === session.id ? session : s))
                  : [session, ...prev];

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
              console.log("🗑️ Session deleted:", payload.old);
              // Remove deleted session
              setSessions((prev) =>
                prev.filter((s) => s.id !== payload.old.id),
              );
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

  return sessions;
}
