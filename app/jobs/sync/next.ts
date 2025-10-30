"use server";

import {
  getBillingPeriod,
  getWorkerLimit,
  hasRemainingSessionAllowance,
} from "@/lib/limits";
import adminSupabase from "@/lib/supabase/admin";
import { start } from "workflow/api";
import { run } from "../run";

export default async function next(
  projectId: string,
  maxJobs: number = 1,
): Promise<number> {
  const supabase = adminSupabase();
  let processedCount = 0;

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
    return 0;
  }

  const plan = projectData.plan;

  // Get all pending sessions for this project (latest first)
  const { data: pendingSessions } = await supabase
    .from("sessions")
    .select("id, external_id, active_duration, session_at")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("session_at", { ascending: false })
    .limit(maxJobs);

  if (!pendingSessions || pendingSessions.length === 0) {
    console.log(`📭 [NEXT JOB] No pending sessions for project ${projectId}`);
    return 0;
  }

  console.log(
    `📋 [NEXT JOB] Found ${pendingSessions.length} pending sessions to process`,
  );

  for (const session of pendingSessions) {
    // Check worker limits before processing
    const { data: activeWorkers } = await supabase
      .from("sessions")
      .select("id")
      .eq("project_id", projectId)
      .in("status", ["processing", "analyzing"]);

    const activeWorkerCount = activeWorkers?.length || 0;
    const workerLimit = getWorkerLimit(plan);

    if (activeWorkerCount >= workerLimit) {
      console.log(
        `⚠️ [NEXT JOB] Project ${projectId} at worker limit (${activeWorkerCount}/${workerLimit}), stopping session processing`,
      );
      break;
    }

    // Check usage limits
    const billingPeriod = getBillingPeriod(projectData);
    const { data: periodSessions } = await supabase
      .from("sessions")
      .select("id")
      .eq("project_id", projectId)
      .eq("status", "analyzed")
      .gte("analyzed_at", billingPeriod.start.toISOString())
      .lte("analyzed_at", billingPeriod.end.toISOString());

    if (!hasRemainingSessionAllowance(plan, periodSessions || [])) {
      console.log(
        `⚠️ [NEXT JOB] Project ${projectId} reached usage limit, stopping session processing`,
      );
      break;
    }

    // Trigger processing
    console.log(
      `🎯 [NEXT JOB] Starting run for session ${session.id} (recording: ${session.external_id})`,
    );
    await start(run, [session.id]);

    processedCount++;
  }

  return processedCount;
}
