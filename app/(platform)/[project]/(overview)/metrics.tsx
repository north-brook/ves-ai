import serverSupabase from "@/lib/supabase/server";
import { Activity, Clock, Hammer, LucideIcon } from "lucide-react";
import { formatSecondsToHours } from "@/lib/limits";
import { platformConfig } from "../queries";
import { createElement } from "react";

export async function Metrics({ projectSlug }: { projectSlug: string }) {
  const supabase = await serverSupabase();

  const { project } = await platformConfig({ projectSlug });

  const { data: sessions } = await supabase
    .from("sessions")
    .select("video_duration")
    .eq("project_id", project.id)
    .eq("status", "analyzed");

  const currentSeconds =
    sessions?.reduce((acc, s) => acc + (s.video_duration || 0), 0) || 0;
  const sessionsCount = sessions?.length || 0;

  const { data: issues } = await supabase
    .from("issues")
    .select("id")
    .eq("project_id", project.id);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard
        title="Analysis Time"
        value={formatSecondsToHours(currentSeconds)}
        icon={Clock}
      />

      <MetricCard
        title="Sessions Analyzed"
        value={sessionsCount.toString()}
        icon={Activity}
      />

      <MetricCard
        title="Issues Found"
        value={issues?.length?.toString() || "0"}
        icon={Hammer}
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
          className="border-border bg-slate-50 dark:bg-slate-900 h-32 animate-pulse rounded-lg border"
        />
      ))}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="border-border bg-slate-50 dark:bg-slate-900 rounded-lg border p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <p className="text-foreground text-3xl font-bold">{value}</p>
            {subtitle && (
              <span className="text-slate-600 dark:text-slate-400 text-sm">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div className="from-accent-purple to-accent-pink flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white">
          {createElement(icon, { size: 20 })}
        </div>
      </div>
    </div>
  );
}
