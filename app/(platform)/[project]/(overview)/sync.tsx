"use client";

import { syncSessions } from "./actions";
import { useQuery } from "@tanstack/react-query";

export default function SyncSessions({ projectSlug }: { projectSlug: string }) {
  // Trigger run job on mount
  useQuery({
    queryKey: ["sync-sessions", projectSlug],
    queryFn: async () => {
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
    refetchOnMount: true,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  });

  return null;
}
