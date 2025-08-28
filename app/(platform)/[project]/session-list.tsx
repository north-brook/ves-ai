"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Session } from "@/types";
import { searchSessions, triggerRunJob } from "./(overview)/actions";
import clientSupabase from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

import { formatDistanceToNow, format } from "date-fns";
import {
  Clock,
  Search,
  Tag,
  Activity,
  Calendar,
  LoaderCircle,
  Bubbles,
  User,
  Building,
} from "lucide-react";
import { SessionStatusBadge } from "@/components/session-status";
import { RealtimeChannel } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

interface SessionListProps {
  sessions: Session[];
  projectSlug: string;
  projectId: string;
}

export function SessionList({
  sessions: initialSessions,
  projectSlug,
  projectId,
}: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Session[] | null>(null);
  const [isPending, startTransition] = useTransition();

  // Trigger run job on mount
  useQuery({
    queryKey: ["trigger-run-job", projectSlug],
    queryFn: async () => {
      console.log(`🔄 [SESSION-LIST] Triggering run job for ${projectSlug}`);
      const result = await triggerRunJob(projectSlug);
      if (!result.success) {
        console.error(
          `❌ [SESSION-LIST] Failed to trigger run job:`,
          result.error,
        );
      }
      return result;
    },
    refetchOnMount: true,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  });

  // Setup realtime subscription for sessions
  useEffect(() => {
    console.log("🔌 Setting up realtime subscriptions for project:", projectId);
    const supabase = clientSupabase();
    // Subscribe to changes in sessions table
    // Using a simpler channel name and configuration
    const channelName = `project-${projectId}-sessions`;
    console.log("📡 Creating channel:", channelName);

    let channel: RealtimeChannel;
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
          (payload) => {
            console.log(
              "📡 Session change detected:",
              payload.eventType,
              payload,
            );
            if (payload.eventType === "INSERT") {
              console.log("➕ New session inserted:", payload.new);
              const newSession = payload.new as Session;

              // First, immediately add the session without ticket count
              setSessions((prev) => {
                // Check if session already exists (in case of duplicate events)
                if (prev.some((s) => s.id === newSession.id)) {
                  return prev;
                }
                const updated = [newSession, ...prev];
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
            } else if (payload.eventType === "UPDATE") {
              console.log("✏️ Session updated:", payload.new);
              const updatedSession = payload.new as Session;

              // First, immediately update the session data (preserve existing ticket count)
              setSessions((prev) => {
                const existingSession = prev.find(
                  (s) => s.id === updatedSession.id,
                );

                const updated = prev.map((s) =>
                  s.id === updatedSession.id ? updatedSession : s,
                );
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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      startTransition(async () => {
        try {
          const results = await searchSessions(projectId, searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error("Search failed:", error);
          setSearchResults([]);
        }
      });
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, projectId]);

  const displaySessions = searchResults || sessions;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <div className="border-border bg-surface rounded-lg border">
      <div className="border-border border-b p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-semibold">
            {displaySessions.length} Sessions
          </h2>

          <div className="relative flex-1 sm:w-64">
            <Search className="text-foreground-secondary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
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
                <div className="border-foreground-secondary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="divide-border divide-y">
        {displaySessions.length === 0 ? (
          <div className="p-8 text-center">
            {searchQuery ? (
              <p className="text-foreground-secondary">
                No matching sessions found
              </p>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <LoaderCircle className="text-foreground-secondary h-6 w-6 animate-spin" />
                <p className="text-foreground-secondary">Awaiting sessions</p>
              </div>
            )}
          </div>
        ) : (
          displaySessions.map((session) => (
            <Link
              key={session.id}
              href={`/${projectSlug}/sessions/${session.id}`}
              className="hover:bg-foreground/5 block p-4 transition-colors duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-foreground font-medium">
                    {session.name ? (
                      session.name
                    ) : (
                      <span className="text-foreground-secondary italic">
                        {session.session_at
                          ? format(
                              new Date(session.session_at),
                              "EEEE MMMM d h:mmaaa",
                            )
                          : "Date unknown"}
                      </span>
                    )}
                  </h3>

                  <div className="text-foreground-secondary mt-2 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(session.total_duration)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <span>
                        {formatDuration(
                          session.video_duration || session.active_duration,
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {session.session_at
                          ? formatDistanceToNow(new Date(session.session_at), {
                              addSuffix: true,
                            })
                          : "Time unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span
                        className={cn(!session.external_user_name && "italic")}
                      >
                        {session.external_user_name || "Anonymous"}
                      </span>
                    </div>
                    {session.external_group_name && (
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span>{session.external_group_name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <SessionStatusBadge
                  session={session}
                  size="md"
                  showLabel={true}
                  showProgress={true}
                />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
