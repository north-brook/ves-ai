import { Database } from "@/types";

type ProjectPlan = Database["public"]["Enums"]["project_plan"];
type Project = Database["public"]["Tables"]["projects"]["Row"];
type Session = Database["public"]["Tables"]["sessions"]["Row"];

// Concurrent worker limits per plan
export const WORKER_LIMITS: Record<ProjectPlan, number> = {
  starter: 5,
  growth: 20,
  scale: 50,
  enterprise: 100,
};

// Monthly session limits per plan
export const MONTHLY_SESSION_LIMITS: Record<ProjectPlan, number> = {
  starter: 100,
  growth: 1000,
  scale: 10000,
  enterprise: 1000000,
};

/**
 * Get the number of available workers for a project
 */
export function getWorkerLimit(plan: ProjectPlan): number {
  return WORKER_LIMITS[plan];
}

/**
 * Get the monthly hour limit for a project (in seconds)
 */
export function getMonthlySessionLimit(plan: ProjectPlan): number {
  return MONTHLY_SESSION_LIMITS[plan];
}

/**
 * Calculate the start and end dates for the current billing period
 */
export function getBillingPeriod(
  project: Pick<Project, "plan" | "subscribed_at" | "created_at">,
): { start: Date; end: Date } {
  const now = new Date();

  if (project.plan === "starter") {
    // Starter is total since creation, not monthly
    return {
      start: new Date(project.created_at),
      end: now,
    };
  }

  // For paid plans, use the subscription date to determine billing cycle
  const subscribeDate = project.subscribed_at
    ? new Date(project.subscribed_at)
    : new Date(project.created_at);
  const billingDay = subscribeDate.getDate();

  // Calculate current billing period
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let periodStart = new Date(currentYear, currentMonth, billingDay);
  let periodEnd = new Date(currentYear, currentMonth + 1, billingDay);

  // If we haven't reached the billing day this month, use previous month
  if (now < periodStart) {
    periodStart = new Date(currentYear, currentMonth - 1, billingDay);
    periodEnd = new Date(currentYear, currentMonth, billingDay);
  }

  return { start: periodStart, end: periodEnd };
}

/**
 * Calculate remaining worker capacity
 */
export function getRemainingWorkerCapacity(
  plan: ProjectPlan,
  activeWorkerCount: number,
): number {
  const limit = getWorkerLimit(plan);
  return Math.max(0, limit - activeWorkerCount);
}

/**
 * Check if project has remaining session allowance
 */
export function hasRemainingSessionAllowance(
  plan: ProjectPlan,
  sessions: Pick<Session, "id">[],
): boolean {
  const limit = getMonthlySessionLimit(plan);
  const currentUsage = sessions.length;
  return currentUsage <= limit;
}

/**
 * Format seconds to human readable hours
 */
export function formatSecondsToHours(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Format number to human readable
 */
export function formatNumberToHumanReadable(number: number): string {
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }

  return number.toString();
}
