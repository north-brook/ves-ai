import type { ProcessRequest } from "@/cloud/src/types";
import adminSupabase from "@/lib/supabase/admin";
import { FatalError } from "workflow";

export type ProcessJobRequest = {
  session_id: string;
};

export async function processReplay(sessionId: string) {
  "use step";

  if (!sessionId) {
    console.error("❌ [PROCESS] Missing session_id");
    throw new Error("Missing session_id");
  }

  console.log(`🎬 [PROCESS] Starting processing for session ${sessionId}`);
  const supabase = adminSupabase();

  // Fetch session with source details
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select(
      "id,external_id,status,active_duration,project_id,source_id,source:sources(id,source_host,source_key,source_project,type),project:projects(slug)",
    )
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    console.error(`❌ [PROCESS] Session not found: ${sessionId}`, sessionError);
    throw new Error("Session not found");
  }

  console.log(`📋 [PROCESS] Session details:`);
  console.log(`   Recording: ${session.external_id}`);
  console.log(`   Status: ${session.status}`);
  console.log(`   Source: ${session.source_id}`);

  // Check if already processing or processed
  if (session.status !== "pending") {
    console.warn(`⚠️ [PROCESS] Session ${sessionId} is already processing`);
    throw new FatalError("Session is already processing");
  }

  if (!session.active_duration) {
    console.error(`❌ [PROCESS] Session ${sessionId} missing active_duration`);
    throw new Error("Session missing active_duration");
  }

  // Prepare cloud service request
  const cloudRequest: ProcessRequest = {
    project_id: session.project_id,
    session_id: session.id,
    source_type: "posthog",
    source_host: session.source.source_host!,
    source_key: session.source.source_key!,
    source_project: session.source.source_project!,
    external_id: session.external_id,
    active_duration: session.active_duration,
    accepted_callback: `${process.env.NEXT_PUBLIC_URL}/jobs/process-replay/accepted`,
    finished_callback: `${process.env.NEXT_PUBLIC_URL}/jobs/process-replay/finished`,
  };

  console.log(`☁️ [PROCESS] Sending request to cloud service`);
  console.log(`   Cloud URL: ${process.env.CLOUD_URL}/process`);
  console.log(`   Recording: ${cloudRequest.external_id}`);
  console.log(
    `   File path: ${cloudRequest.project_id}/${cloudRequest.session_id}.webm`,
  );

  // Call cloud rendering service with fire-and-forget pattern
  // Session status will be updated to "processing" only when cloud service
  // calls the accepted_callback endpoint, ensuring no stuck sessions
  console.log(`🚀 [PROCESS] Triggering cloud service (fire-and-forget)`);
  fetch(`${process.env.CLOUD_URL}/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cloudRequest),
  }).catch((error) => {
    console.error(
      `⚠️ [PROCESS] Failed to reach cloud service for session ${sessionId}:`,
      error.message,
    );
    console.error(`   Session will remain in "pending" status for retry`);
  });

  return {
    success: true,
    sessionId,
    message: "Cloud service request sent",
  };
}
