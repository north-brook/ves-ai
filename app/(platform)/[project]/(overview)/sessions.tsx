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
      <h2 className="text-foreground mb-4 text-xl font-semibold">
        Priority Sessions
      </h2>
      {!!sessions?.length && (
        <div className="grid gap-4 md:grid-cols-2">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
          {!sessions?.length && (
            <div className="flex flex-col items-center gap-3">
              <LoaderCircle className="h-6 w-6 animate-spin text-slate-600 dark:text-slate-400" />
              <p className="text-slate-600 dark:text-slate-400">
                Awaiting sessions
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RecentSessionsSkeleton() {
  return (
    <div className="w-full">
      <div className="h-7 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700 mb-4" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
    </div>
  );
}
