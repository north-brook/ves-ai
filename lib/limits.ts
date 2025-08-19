import { Database } from "@/types";

type ProjectPlan = Database["public"]["Enums"]["project_plan"];
type Project = Database["public"]["Tables"]["projects"]["Row"];
type Session = Database["public"]["Tables"]["sessions"]["Row"];

// Worker limits per plan
export const WORKER_LIMITS: Record<ProjectPlan, number> = {
  trial: 2,
  starter: 5,
  growth: 10,
  scale: 20,
  enterprise: 100,
};

// Monthly hour limits per plan (in seconds for easier calculation)
export const MONTHLY_HOUR_LIMITS: Record<ProjectPlan, number> = {
  trial: 1 * 60 * 60, // 1 hour in seconds
  starter: 20 * 60 * 60, // 20 hours in seconds
  growth: 100 * 60 * 60, // 100 hours in seconds
  scale: 300 * 60 * 60, // 300 hours in seconds
  enterprise: 999999 * 60 * 60, // Effectively unlimited
};

/**
 * Get the number of available workers for a project
 */
export function getWorkerLimit(plan: ProjectPlan): number {
  return WORKER_LIMITS[plan] || WORKER_LIMITS.trial;
}

/**
 * Get the monthly hour limit for a project (in seconds)
 */
export function getMonthlyHourLimit(plan: ProjectPlan): number {
  return MONTHLY_HOUR_LIMITS[plan] || MONTHLY_HOUR_LIMITS.trial;
}

/**
 * Calculate the start and end dates for the current billing period
 */
export function getBillingPeriod(
  project: Pick<Project, "plan" | "subscribed_at" | "created_at">,
): { start: Date; end: Date } {
  const now = new Date();

  if (project.plan === "trial") {
    // Trial is total since creation, not monthly
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
 * Calculate total usage in seconds for a list of sessions
 */
export function calculateTotalUsage(
  sessions: Pick<Session, "video_duration">[],
): number {
  return sessions.reduce((total, session) => {
    return total + (session.video_duration || 0);
  }, 0);
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
 * Check if project has remaining hourly allowance
 */
export function hasRemainingAllowance(
  plan: ProjectPlan,
  currentUsageSeconds: number,
  sessionDurationSeconds: number = 0,
): boolean {
  const limit = getMonthlyHourLimit(plan);
  return currentUsageSeconds + sessionDurationSeconds <= limit;
}

/**
 * Calculate remaining allowance in seconds
 */
export function getRemainingAllowance(
  plan: ProjectPlan,
  currentUsageSeconds: number,
): number {
  const limit = getMonthlyHourLimit(plan);
  return Math.max(0, limit - currentUsageSeconds);
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
