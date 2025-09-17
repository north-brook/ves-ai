"use client";

import clientSupabase from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";

export function useAnalysisTime({
  projectId,
  initialAnalysisTime,
}: {
  projectId?: string;
  initialAnalysisTime: string;
}) {
  const [analysisTime, setAnalysisTime] = useState(initialAnalysisTime);

  let channel: RealtimeChannel;
  useEffect(() => {
    if (!projectId) return;

    const supabase = clientSupabase();
    const channelName = `project-${projectId}-analysis-time`;

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
            if (
              payload.eventType === "UPDATE" ||
              payload.eventType === "INSERT"
            ) {
              const { data: sessions } = await supabase
                .from("sessions")
                .select("video_duration")
                .eq("project_id", projectId)
                .eq("status", "analyzed");

              const totalSeconds =
                sessions?.reduce(
                  (acc, s) => acc + (s.video_duration || 0),
                  0,
                ) || 0;

              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              setAnalysisTime(`${hours}h ${minutes}m`);
            }
          },
        )
        .subscribe();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  if (!projectId) return null;

  return analysisTime;
}

export function useSessionsAnalyzed({
  projectId,
  initialSessionsAnalyzed,
}: {
  projectId?: string;
  initialSessionsAnalyzed: number;
}) {
  const [sessionsAnalyzed, setSessionsAnalyzed] = useState(
    initialSessionsAnalyzed,
  );

  let channel: RealtimeChannel;
  useEffect(() => {
    if (!projectId) return;

    const supabase = clientSupabase();
    const channelName = `project-${projectId}-sessions-count`;

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
            if (payload.eventType === "INSERT") {
              const newSession = payload.new;
              if (newSession.status === "analyzed") {
                setSessionsAnalyzed((prev) => prev + 1);
              }
            } else if (payload.eventType === "UPDATE") {
              const oldSession = payload.old;
              const newSession = payload.new;

              if (
                oldSession.status !== "analyzed" &&
                newSession.status === "analyzed"
              ) {
                setSessionsAnalyzed((prev) => prev + 1);
              } else if (
                oldSession.status === "analyzed" &&
                newSession.status !== "analyzed"
              ) {
                setSessionsAnalyzed((prev) => Math.max(0, prev - 1));
              }
            } else if (payload.eventType === "DELETE") {
              const deletedSession = payload.old;
              if (deletedSession.status === "analyzed") {
                setSessionsAnalyzed((prev) => Math.max(0, prev - 1));
              }
            }
          },
        )
        .subscribe();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  if (!projectId) return null;

  return sessionsAnalyzed;
}

export function useIssuesFound({
  projectId,
  initialIssuesFound,
}: {
  projectId?: string;
  initialIssuesFound: number;
}) {
  const [issuesFound, setIssuesFound] = useState(initialIssuesFound);

  let channel: RealtimeChannel;
  useEffect(() => {
    if (!projectId) return;

    const supabase = clientSupabase();
    const channelName = `project-${projectId}-issues-count`;

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
          (payload) => {
            if (payload.eventType === "INSERT") {
              setIssuesFound((prev) => prev + 1);
            } else if (payload.eventType === "DELETE") {
              setIssuesFound((prev) => Math.max(0, prev - 1));
            }
          },
        )
        .subscribe();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  if (!projectId) return null;

  return issuesFound;
}
