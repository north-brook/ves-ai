"use client";

import { useState, useEffect } from "react";
import { PostHogReplay } from "./posthog-replay";
import { SessionAnalysis } from "./session-analysis";
import { LinearTickets } from "./linear-tickets";
import { Session, Ticket } from "@/types";
import clientSupabase from "@/lib/supabase/client";

interface SessionContentClientProps {
  initialSession: Session;
  initialTickets: Ticket[];
}

export function SessionContentClient({
  initialSession,
  initialTickets,
}: SessionContentClientProps) {
  const [session, setSession] = useState<Session>(initialSession);
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);

  useEffect(() => {
    console.log(
      "🔌 Setting up realtime subscriptions for session content:",
      session.id,
    );
    const supabase = clientSupabase();

    // Test the connection
    console.log("🔍 Supabase client status:", {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      sessionId: session.id,
    });

    // Subscribe to session updates
    const sessionChannel = supabase
      .channel(`session-content-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          console.log("✏️ Session content update received:", payload.new);
          setSession(payload.new as Session);
        },
      )
      .subscribe((status, error) => {
        console.log(
          "📻 Session content subscription status:",
          status,
          "Error:",
          error,
        );
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to session content updates");
          console.log("📋 Session channel details:", {
            channel: sessionChannel.topic,
            state: sessionChannel.state,
            params: sessionChannel.params,
          });
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Error subscribing to session content updates");
          console.error("🔍 Session channel error details:", {
            error: error,
            channel: sessionChannel.topic,
            state: sessionChannel.state,
            params: sessionChannel.params,
            socket: sessionChannel.socket?.isConnected()
              ? "connected"
              : "disconnected",
            filter: `id=eq.${session.id}`,
          });
          console.error(
            "🔍 Postgres changes subscriptions:",
            sessionChannel.bindings,
          );
        } else if (status === "TIMED_OUT") {
          console.error("⏰ Session content subscription timed out");
          console.error("🔍 Timeout details:", {
            channel: sessionChannel.topic,
            state: sessionChannel.state,
            socket: sessionChannel.socket?.isConnected()
              ? "connected"
              : "disconnected",
          });
        }
      });

    // Subscribe to session_tickets changes
    const ticketsChannel = supabase
      .channel(`session-tickets-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_tickets",
          filter: `session_id=eq.${session.id}`,
        },
        async (payload) => {
          console.log(
            "🎫 Session tickets change detected:",
            payload.eventType,
            payload,
          );
          // Refetch tickets when session_tickets change
          const { data: sessionTickets } = await supabase
            .from("session_tickets")
            .select("*, tickets(*)")
            .eq("session_id", session.id);

          if (sessionTickets) {
            const newTickets = sessionTickets
              .map((st) => st.tickets)
              .filter(Boolean) as Ticket[];
            console.log("🎫 Updated tickets list:", newTickets);
            setTickets(newTickets);
          }
        },
      )
      .subscribe((status, error) => {
        console.log("📻 Tickets subscription status:", status, "Error:", error);
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to ticket updates");
          console.log("📋 Tickets channel details:", {
            channel: ticketsChannel.topic,
            state: ticketsChannel.state,
            params: ticketsChannel.params,
          });
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Error subscribing to ticket updates");
          console.error("🔍 Tickets channel error details:", {
            error: error,
            channel: ticketsChannel.topic,
            state: ticketsChannel.state,
            params: ticketsChannel.params,
            socket: ticketsChannel.socket?.isConnected()
              ? "connected"
              : "disconnected",
            filter: `session_id=eq.${session.id}`,
          });
          console.error(
            "🔍 Postgres changes subscriptions:",
            ticketsChannel.bindings,
          );
        } else if (status === "TIMED_OUT") {
          console.error("⏰ Tickets subscription timed out");
          console.error("🔍 Timeout details:", {
            channel: ticketsChannel.topic,
            state: ticketsChannel.state,
            socket: ticketsChannel.socket?.isConnected()
              ? "connected"
              : "disconnected",
          });
        }
      });

    return () => {
      console.log("🔌 Cleaning up session content subscriptions");
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(ticketsChannel);
    };
  }, [session.id]);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <PostHogReplay replayUrl={session.embed_url || ""} />

        <div className="border-border bg-surface rounded-lg border p-6">
          {session.analysis ? (
            <SessionAnalysis analysis={session.analysis} />
          ) : (
            <>
              <h2 className="font-display mb-4 text-xl font-semibold">
                AI Analysis
              </h2>
              <div className="py-8 text-center">
                <p className="text-foreground-secondary italic">
                  {session.status === "analyzing"
                    ? "Ready in ~1 min"
                    : session.status === "processing" ||
                        session.status === "processed" ||
                        session.status === "pending"
                      ? `Ready in ~${Math.max(5, Math.ceil((session.active_duration || 60) / 60))} mins`
                      : "Analysis unavailable"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:h-fit">
        <div className="border-border bg-surface rounded-lg border p-6">
          <h3 className="font-display mb-4 text-lg font-semibold">Tickets</h3>
          {tickets.length > 0 ? (
            <LinearTickets tickets={tickets} />
          ) : (
            <p className="text-foreground-secondary text-sm italic">
              {session.status === "analyzed"
                ? "No linked tickets"
                : session.status === "analyzing"
                  ? "Ready in ~1 min"
                  : `Ready in ~${Math.max(5, Math.ceil((session.active_duration || 60) / 60))} mins`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
