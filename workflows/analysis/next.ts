import {
  getBillingPeriod,
  getWorkerLimit,
  hasRemainingSessionAllowance,
} from "@/lib/limits";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import { start } from "workflow/api";
import { analysis } from ".";

export async function next(sessionId: string) {
  "use step";

  const supabase = adminSupabase();

  // Get session project id
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("project_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found");
  }

  // Get project data for limits
  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("plan, subscribed_at, created_at")
    .eq("id", session.project_id)
    .single();

  if (projectError || !projectData) {
    const error = projectError || new Error("Project data not found");
    console.error(
      `❌ [NEXT JOB] Could not fetch project data for ${session.project_id}`,
      error,
    );
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "next" },
      extra: { projectId: session.project_id },
    });
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
      .eq("project_id", session.project_id)
      .in("status", ["processing", "analyzing"]),
    supabase
      .from("sessions")
      .select("id")
      .eq("project_id", session.project_id)
      .eq("status", "analyzed")
      .gte("analyzed_at", billingPeriod.start.toISOString())
      .lte("analyzed_at", billingPeriod.end.toISOString()),
  ]);

  if (activeWorkersData.error) {
    console.error(
      `❌ [NEXT JOB] Error checking active workers:`,
      activeWorkersData.error,
    );
    Sentry.captureException(activeWorkersData.error, {
      tags: { job: "analyzeSession", step: "next" },
      extra: { projectId: session.project_id },
    });
    return false;
  }

  if (periodSessionsData.error) {
    console.error(
      `❌ [NEXT JOB] Error checking period sessions:`,
      periodSessionsData.error,
    );
    Sentry.captureException(periodSessionsData.error, {
      tags: { job: "analyzeSession", step: "next" },
      extra: {
        projectId: session.project_id,
        billingPeriod: {
          start: billingPeriod.start.toISOString(),
          end: billingPeriod.end.toISOString(),
        },
      },
    });
    return false;
  }

  const activeWorkerCount = activeWorkersData.data?.length || 0;
  const periodSessions = periodSessionsData.data || [];

  // Early exit if at capacity
  if (activeWorkerCount >= workerLimit) {
    console.log(
      `⚠️ [NEXT JOB] Project ${session.project_id} at worker limit (${activeWorkerCount}/${workerLimit})`,
    );
    return false;
  }

  // Check usage limit
  if (!hasRemainingSessionAllowance(plan, periodSessions)) {
    console.log(
      `⚠️ [NEXT JOB] Project ${session.project_id} reached usage limit`,
    );
    return false;
  }

  // Get the next pending session (latest first)
  const { data: pendingSessions, error: pendingSessionsError } = await supabase
    .from("sessions")
    .select("id, external_id, active_duration, session_at")
    .eq("project_id", session.project_id)
    .eq("status", "pending")
    .order("session_at", { ascending: false })
    .limit(1);

  if (pendingSessionsError) {
    console.error(
      `❌ [NEXT JOB] Error fetching pending sessions:`,
      pendingSessionsError,
    );
    Sentry.captureException(pendingSessionsError, {
      tags: { job: "analyzeSession", step: "next" },
      extra: { projectId: session.project_id },
    });
    return false;
  }

  if (!pendingSessions || pendingSessions.length === 0) {
    console.log(
      `📭 [NEXT JOB] No pending sessions for project ${session.project_id}`,
    );
    return false;
  }

  const nextSession = pendingSessions[0];

  // Trigger processing
  console.log(
    `🎯 [NEXT JOB] Starting run for session ${nextSession.id} (recording: ${nextSession.external_id})`,
  );
  try {
    await start(analysis, [nextSession.id]);
  } catch (error) {
    console.error(`❌ [NEXT JOB] Error starting analysis workflow:`, error);
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "next" },
      extra: { projectId: session.project_id, sessionId: nextSession.id },
    });
    return false;
  }

  return true;
}
