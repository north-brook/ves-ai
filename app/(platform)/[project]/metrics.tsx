import serverSupabase from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Activity, Clock, Ticket } from "lucide-react";
import { MetricCard } from "./metric-card";
import { getMonthlyHourLimit, formatSecondsToHours } from "@/lib/limits";

export async function Metrics({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", projectSlug)
    .single();

  if (!project) {
    redirect("/home");
  }

  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("project_id", project.id)
    .eq("user_id", authUser.id)
    .single();

  if (!role) {
    redirect("/home");
  }

  const currentDate = new Date();
  const startOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );

  const { data: analyzedSessions } = await supabase
    .from("sessions")
    .select("video_duration")
    .eq("project_id", project.id)
    .eq("status", "analyzed")
    .gte("analyzed_at", startOfMonth.toISOString());

  const { data: currentTickets } = await supabase
    .from("tickets")
    .select("id")
    .eq("project_id", project.id)
    .gte("created_at", startOfMonth.toISOString());

  const currentSeconds =
    analyzedSessions?.reduce((acc, s) => acc + (s.video_duration || 0), 0) || 0;
  const sessionsCount = analyzedSessions?.length || 0;
  const ticketsCount = currentTickets?.length || 0;

  // Calculate hours remaining based on plan
  const monthlyLimitSeconds = getMonthlyHourLimit(project.plan);

  return (
    <div className="mb-8 grid gap-4 md:grid-cols-3">
      <MetricCard
        title="Analysis Time"
        value={formatSecondsToHours(currentSeconds)}
        icon={<Clock className="h-5 w-5" />}
        subtitle={`/ ${formatSecondsToHours(monthlyLimitSeconds)}`}
      />

      <MetricCard
        title="Sessions Analyzed"
        value={sessionsCount.toString()}
        icon={<Activity className="h-5 w-5" />}
      />

      <MetricCard
        title="Tickets Created"
        value={ticketsCount.toString()}
        icon={<Ticket className="h-5 w-5" />}
      />
    </div>
  );
}

export function MetricsSkeleton() {
  return (
    <div className="mb-8 grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="border-border bg-surface h-32 animate-pulse rounded-lg border"
        />
      ))}
    </div>
  );
}
