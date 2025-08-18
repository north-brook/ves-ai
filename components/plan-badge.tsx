import { cn } from "@/lib/utils";

export type ProjectPlan = "trial" | "starter" | "growth" | "scale" | "enterprise";

interface PlanBadgeProps {
  plan: ProjectPlan;
  size?: "sm" | "md" | "lg";
}

export function PlanBadge({ plan, size = "md" }: PlanBadgeProps) {
  const getPlanConfig = () => {
    switch (plan) {
      case "trial":
        return {
          label: "Trial",
          color: "text-gray-500 bg-gray-500/10 border-gray-500/20",
        };
      case "starter":
        return {
          label: "Starter",
          color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        };
      case "growth":
        return {
          label: "Growth",
          color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
        };
      case "scale":
        return {
          label: "Scale",
          color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
        };
      case "enterprise":
        return {
          label: "Enterprise",
          color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
        };
      default:
        return {
          label: "Unknown",
          color: "text-gray-500 bg-gray-500/10 border-gray-500/20",
        };
    }
  };

  const config = getPlanConfig();

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium transition-all",
        config.color,
        sizeClasses[size],
      )}
    >
      {config.label}
    </span>
  );
}