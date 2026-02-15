"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { syncSessions } from "./actions";

export default function SyncSessions() {
  const params = useParams();
  const projectSlug = params.project as string;

  // Trigger run job on mount
  useQuery({
    queryKey: ["sync-sessions", projectSlug],
    queryFn: async () => {
      if (!projectSlug) return;
      console.log(`🔄 [SYNC SESSIONS] Triggering run job for ${projectSlug}`);
      const result = await syncSessions(projectSlug);
      if (!result.success) {
        console.error(
          `❌ [SYNC SESSIONS] Failed to trigger run job:`,
          result.error,
        );
      }
      return result;
    },
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return null;
}
