import serverSupabase from "@/lib/supabase/server";
import SessionCard from "../sessions/card";
import { LoaderCircle } from "lucide-react";
import { platformConfig } from "../queries";
import { subWeeks } from "date-fns";

export async function RecentSessions({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();

  const { project } = await platformConfig({ projectSlug });

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "*, user:project_users(*), group:project_groups(*), issues:issues(*)",
    )
    .eq("project_id", project.id)
    .order("score", { ascending: true })
    .gte("session_at", subWeeks(new Date(), 2).toISOString())
    .limit(12);

  return (
    <div className="w-full">
      <h2 className="text-foreground mb-4 text-xl font-medium">
        Priority Sessions
      </h2>
      {!!sessions?.length && (
        <div className="grid gap-4 md:grid-cols-2">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
          {!sessions?.length && (
            <div className="flex flex-col items-center gap-3">
              <LoaderCircle className="text-slate-600 dark:text-slate-400 h-6 w-6 animate-spin" />
              <p className="text-slate-600 dark:text-slate-400">Awaiting sessions</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RecentSessionsSkeleton() {
  return (
    <div className="border-border bg-slate-50 dark:bg-slate-900 rounded-lg border">
      <div className="border-border border-b p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="bg-slate-200 dark:bg-slate-800 h-7 w-32 animate-pulse rounded" />
          <div className="bg-slate-200 dark:bg-slate-800 h-10 w-64 animate-pulse rounded-lg" />
        </div>
      </div>
      <div className="divide-border divide-y">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-slate-200 dark:bg-slate-800 h-5 w-48 animate-pulse rounded" />
                <div className="bg-slate-200 dark:bg-slate-800 h-6 w-20 animate-pulse rounded-full" />
              </div>
              <div className="flex gap-4">
                <div className="bg-slate-200 dark:bg-slate-800 h-4 w-24 animate-pulse rounded" />
                <div className="bg-slate-200 dark:bg-slate-800 h-4 w-16 animate-pulse rounded" />
                <div className="bg-slate-200 dark:bg-slate-800 h-4 w-32 animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
