import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import {
  calculateTotalUsage,
  getBillingPeriod,
  getWorkerLimit,
  hasRemainingAllowance,
} from "@/lib/limits";
import { ProcessJobRequest } from "../process/route";

export default async function nextJobs(
  projectId: string,
  maxJobs: number = 20,
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
    console.error(`❌ [PROCESS] Could not fetch project data for ${projectId}`);
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
    console.log(`📭 [PROCESS] No pending sessions for project ${projectId}`);
    return 0;
  }

  console.log(
    `📋 [PROCESS] Found ${pendingSessions.length} pending sessions to process`,
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
        `⚠️ [LIMITS] Project ${projectId} at worker limit (${activeWorkerCount}/${workerLimit}), stopping session processing`,
      );
      break;
    }

    // Check usage limits
    const billingPeriod = getBillingPeriod(projectData);
    const { data: periodSessions } = await supabase
      .from("sessions")
      .select("video_duration")
      .eq("project_id", projectId)
      .eq("status", "analyzed")
      .gte("analyzed_at", billingPeriod.start.toISOString())
      .lte("analyzed_at", billingPeriod.end.toISOString());

    const currentUsage = calculateTotalUsage(periodSessions || []);
    if (!hasRemainingAllowance(plan, currentUsage)) {
      console.log(
        `⚠️ [LIMITS] Project ${projectId} reached usage limit, stopping session processing`,
      );
      break;
    }

    // Trigger processing
    try {
      console.log(
        `🎯 [PROCESS] Triggering processing for session ${session.id} (recording: ${session.external_id})`,
      );
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/jobs/process`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
          body: JSON.stringify({ session_id: session.id } as ProcessJobRequest),
        },
      );

      if (response.ok) {
        console.log(
          `✅ [PROCESS] Successfully triggered processing for session ${session.id}`,
        );
        processedCount++;
      } else {
        console.error(
          `⚠️ [PROCESS] Process trigger returned ${response.status} for session ${session.id}`,
        );
      }
    } catch (error) {
      console.error(
        `❌ [PROCESS] Error triggering process for session ${session.id}:`,
        error,
      );
      Sentry.captureException(error, {
        tags: { job: "process_pending", step: "trigger_process" },
        extra: { sessionId: session.id, projectId },
      });
    }
  }

  return processedCount;
}

type RecordingMeta = {
  recording_duration?: number;
  active_seconds?: number;
};

async function enableSharingAndGetEmbedUrl(
  sourceHost: string,
  sourceKey: string,
  sourceProject: string,
  externalId: string,
): Promise<string> {
  const host = sourceHost.replace(/\/+$/, "");
  const base = `${host}/api/projects/${sourceProject}/session_recordings/${externalId}`;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sourceKey}`,
  };

  // 1) Enable sharing (idempotent)
  {
    const res = await fetch(`${base}/sharing/`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ enabled: true }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PostHog sharing PATCH failed: ${res.status} ${text}`);
    }
  }

  // 2) Retrieve access token
  const getRes = await fetch(`${base}/sharing/`, { headers });
  if (!getRes.ok) {
    const text = await getRes.text();
    throw new Error(`PostHog sharing GET failed: ${getRes.status} ${text}`);
  }
  const json = (await getRes.json()) as {
    accessToken?: string;
    access_token?: string;
  };
  const token = json.accessToken ?? json.access_token;
  if (!token)
    throw new Error("PostHog sharing: access token missing in response");
  return `${host}/embedded/${token}`;
}
