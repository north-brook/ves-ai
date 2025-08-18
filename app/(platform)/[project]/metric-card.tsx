interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: React.ReactNode;
}

export function MetricCard({ title, value, icon, subtitle }: MetricCardProps) {
  return (
    <div className="border-border bg-surface rounded-lg border p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-foreground-secondary text-sm font-medium">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <p className="text-foreground text-3xl font-bold">{value}</p>
            {subtitle && (
              <span className="text-foreground-secondary text-sm">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div className="from-accent-purple to-accent-pink flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white">
          {icon}
        </div>
      </div>
    </div>
  );
}
