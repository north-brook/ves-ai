import {
  getBillingPeriod,
  getWorkerLimit,
  hasRemainingSessionAllowance,
} from "@/lib/limits";
import adminSupabase from "@/lib/supabase/admin";
import { FatalError } from "workflow";
import { start } from "workflow/api";
import { analysis } from "../analysis";
import * as Sentry from "@sentry/nextjs";

export async function kickoff(sessionId: string) {
  "use step";

  const supabase = adminSupabase();

  // get session
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select(
      "id, external_id, project:projects(id, name, slug, plan, subscribed_at, created_at)",
    )
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    const error = sessionError || new Error("Session not found");
    console.error(`❌ [KICKOFF] Error getting session:`, error);
    Sentry.captureException(error, {
      tags: { job: "syncSessions", step: "kickoff" },
      extra: { sessionId },
    });
    throw new FatalError("Session not found");
  }

  const plan = session.project.plan;
  const billingPeriod = getBillingPeriod(session.project);
  const workerLimit = getWorkerLimit(plan);

  // Check current worker count and usage limits
  const [activeWorkersData, periodSessionsData] = await Promise.all([
    supabase
      .from("sessions")
      .select("id")
      .eq("project_id", session.project.id)
      .in("status", ["processing", "analyzing"]),
    supabase
      .from("sessions")
      .select("id")
      .eq("project_id", session.project.id)
      .eq("status", "analyzed")
      .gte("analyzed_at", billingPeriod.start.toISOString())
      .lte("analyzed_at", billingPeriod.end.toISOString()),
  ]);

  if (activeWorkersData.error) {
    console.error(
      `❌ [KICKOFF] Error checking active workers:`,
      activeWorkersData.error,
    );
    Sentry.captureException(activeWorkersData.error, {
      tags: { job: "syncSessions", step: "kickoff" },
      extra: { sessionId, projectId: session.project.id },
    });
    throw activeWorkersData.error;
  }

  if (periodSessionsData.error) {
    console.error(
      `❌ [KICKOFF] Error checking period sessions:`,
      periodSessionsData.error,
    );
    Sentry.captureException(periodSessionsData.error, {
      tags: { job: "syncSessions", step: "kickoff" },
      extra: {
        sessionId,
        projectId: session.project.id,
        billingPeriod: {
          start: billingPeriod.start.toISOString(),
          end: billingPeriod.end.toISOString(),
        },
      },
    });
    throw periodSessionsData.error;
  }

  const activeWorkerCount = activeWorkersData.data?.length || 0;
  const periodSessions = periodSessionsData.data || [];

  // Early exit if at capacity
  if (activeWorkerCount >= workerLimit) {
    console.log(
      `⚠️ [NEXT JOB] Project ${session.project.id} at worker limit (${activeWorkerCount}/${workerLimit})`,
    );
    return false;
  }

  // Check usage limit
  if (!hasRemainingSessionAllowance(plan, periodSessions)) {
    console.log(
      `⚠️ [NEXT JOB] Project ${session.project.id} reached usage limit`,
    );
    return false;
  }

  // Trigger processing
  console.log(
    `🎯 [NEXT JOB] Starting run for session ${session.id} (recording: ${session.external_id})`,
  );
  try {
    await start(analysis, [session.id]);
  } catch (error) {
    console.error(`❌ [KICKOFF] Error starting analysis workflow:`, error);
    Sentry.captureException(error, {
      tags: { job: "syncSessions", step: "kickoff" },
      extra: { sessionId, projectId: session.project.id },
    });
    throw error;
  }

  return true;
}
