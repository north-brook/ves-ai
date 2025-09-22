"use client";

import { useEffect, useState } from "react";
import { Issue } from "@/types";
import clientSupabase from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export default function useLiveIssues({
  projectId,
  initialIssues,
}: {
  projectId: string;
  initialIssues: (Issue & {
    sessions: { id: string }[];
  })[];
}) {
  const [issues, setIssues] = useState<
    (Issue & {
      sessions: { id: string }[];
    })[]
  >(initialIssues);

  // Setup realtime subscription for sessions
  let channel: RealtimeChannel;
  useEffect(() => {
    console.log("🔌 Setting up realtime subscriptions for project:", projectId);
    const supabase = clientSupabase();
    // Subscribe to changes in sessions table
    // Using a simpler channel name and configuration
    const channelName = `project-${projectId}-issues`;
    console.log("📡 Creating channel:", channelName);

    supabase.realtime.setAuth().then(() => {
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "issues",
            filter: `project_id=eq.${projectId}`,
          },
          async (payload) => {
            console.log(
              "📡 Issue change detected:",
              payload.eventType,
              payload,
            );
            if (payload.eventType === "INSERT") {
              console.log("➕ New issue inserted:", payload.new);
              const newIssue = payload.new as Issue;

              // get session user, group, and issues
              const { data: issue } = await supabase
                .from("issues")
                .select("*, sessions(id)")
                .eq("id", newIssue.id)
                .single();

              if (!issue) return;

              setIssues((prev) => {
                const updated = prev.some((i) => i.id === issue.id)
                  ? prev.map((i) => (i.id === issue.id ? issue : i))
                  : [issue, ...prev];

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
              console.log("✏️ Issue updated:", payload.new);
              const updatedIssue = payload.new as Issue;

              // get session user, group, and issues
              const { data: issue } = await supabase
                .from("issues")
                .select("*, sessions(*)")
                .eq("id", updatedIssue.id)
                .single();

              if (!issue) return;

              setIssues((prev) => {
                const updated = prev.some((i) => i.id === issue.id)
                  ? prev.map((i) => (i.id === issue.id ? issue : i))
                  : [issue, ...prev];

                // Sort by session_at descending (most recent first)
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
              console.log("🗑️ Issue deleted:", payload.old);
              // Remove deleted session
              setIssues((prev) => prev.filter((i) => i.id !== payload.old.id));
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

  return issues;
}
