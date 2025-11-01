"use server";

import {
  getBillingPeriod,
  getWorkerLimit,
  hasRemainingSessionAllowance,
} from "@/lib/limits";
import adminSupabase from "@/lib/supabase/admin";
import { start } from "workflow/api";
import { run } from "../run";

export default async function kickoff(projectId: string): Promise<boolean> {
  const supabase = adminSupabase();

  // Get project data for limits
  const { data: projectData } = await supabase
    .from("projects")
    .select("plan, subscribed_at, created_at")
    .eq("id", projectId)
    .single();

  if (!projectData) {
    console.error(
      `❌ [NEXT JOB] Could not fetch project data for ${projectId}`,
    );
    return false;
  }

  const plan = projectData.plan;
  const billingPeriod = getBillingPeriod(projectData);
  const workerLimit = getWorkerLimit(plan);

  // Check current worker count and usage limits
  const [activeWorkersData, periodSessionsData] = await Promise.all([
    supabase
      .from("sessions")
      .select("id")
      .eq("project_id", projectId)
      .in("status", ["processing", "analyzing"]),
    supabase
      .from("sessions")
      .select("id")
      .eq("project_id", projectId)
      .eq("status", "analyzed")
      .gte("analyzed_at", billingPeriod.start.toISOString())
      .lte("analyzed_at", billingPeriod.end.toISOString()),
  ]);

  const activeWorkerCount = activeWorkersData.data?.length || 0;
  const periodSessions = periodSessionsData.data || [];

  // Early exit if at capacity
  if (activeWorkerCount >= workerLimit) {
    console.log(
      `⚠️ [NEXT JOB] Project ${projectId} at worker limit (${activeWorkerCount}/${workerLimit})`,
    );
    return false;
  }

  // Check usage limit
  if (!hasRemainingSessionAllowance(plan, periodSessions)) {
    console.log(`⚠️ [NEXT JOB] Project ${projectId} reached usage limit`);
    return false;
  }

  // Get the next pending session (latest first)
  const { data: pendingSessions } = await supabase
    .from("sessions")
    .select("id, external_id, active_duration, session_at")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("session_at", { ascending: false })
    .limit(1);

  if (!pendingSessions || pendingSessions.length === 0) {
    console.log(`📭 [NEXT JOB] No pending sessions for project ${projectId}`);
    return false;
  }

  const session = pendingSessions[0];

  // Trigger processing
  console.log(
    `🎯 [NEXT JOB] Starting run for session ${session.id} (recording: ${session.external_id})`,
  );
  await start(run, [session.id]);

  return true;
}
