import { NextRequest, NextResponse } from "next/server";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import type { SuccessPayload, ErrorPayload } from "@/cloud/src/types";
import { Database } from "@/types";
import {
  getWorkerLimit,
  getBillingPeriod,
  calculateTotalUsage,
  getRemainingWorkerCapacity,
  hasRemainingAllowance,
  formatSecondsToHours,
} from "@/lib/limits";

export async function POST(request: NextRequest) {
  try {
    const payload: SuccessPayload | ErrorPayload = await request.json();

    console.log(`📥 [CALLBACK] Received callback from cloud service`);
    console.log(`   Success: ${payload.success}`);

    const supabase = adminSupabase();

    if (payload.success) {
      // Handle successful processing
      const successData = payload as SuccessPayload;
      console.log(
        `✅ [CALLBACK] Processing succeeded for recording ${successData.recording_id}`,
      );
      console.log(`   Video URL: ${successData.url}`);
      console.log(`   Duration: ${successData.video_duration}s`);

      // Find session by recording_id
      const { data: session, error: findError } = await supabase
        .from("sessions")
        .select("id, status, project_id, project:projects(slug)")
        .eq("recording_id", successData.recording_id)
        .eq("status", "processing")
        .single();

      if (findError || !session) {
        console.error(
          `❌ [CALLBACK] Session not found for recording ${successData.recording_id}`,
        );
        console.error(`   Error:`, findError);

        // Log but don't fail - the recording might have been processed already
        Sentry.captureMessage(
          `Callback for unknown session: ${successData.recording_id}`,
          {
            level: "warning",
            tags: { job: "callback" },
            extra: { payload: successData },
          },
        );

        return NextResponse.json(
          {
            success: false,
            error: "Session not found or not in processing state",
          },
          { status: 404 },
        );
      }

      console.log(`🔄 [CALLBACK] Updating session ${session.id} to processed`);

      // Update session with video data (embed_url already saved during pull)
      const updateData: Database["public"]["Tables"]["sessions"]["Update"] = {
        status: "processed",
        video_url: successData.url,
        video_duration: successData.video_duration,
      };

      const { error: updateError } = await supabase
        .from("sessions")
        .update(updateData)
        .eq("id", session.id);

      if (updateError) {
        console.error(`❌ [CALLBACK] Failed to update session:`, updateError);
        throw updateError;
      }

      console.log(`✨ [CALLBACK] Successfully updated session ${session.id}`);
      console.log(`   Status: processing → processed`);
      console.log(`   Video: ${successData.url}`);
      console.log(`   Duration: ${successData.video_duration}s`);

      // Trigger analysis for this session
      console.log(
        `🤖 [CALLBACK] Checking if we should trigger analysis for session ${session.id}`,
      );

      // Get project details for limit checking
      const { data: projectData } = await supabase
        .from("projects")
        .select("id, plan, subscribed_at, created_at")
        .eq("id", session.project_id)
        .single();

      if (projectData) {
        const plan = projectData.plan;

        // Check worker limits
        const { data: activeWorkers } = await supabase
          .from("sessions")
          .select("id")
          .eq("project_id", session.project_id)
          .in("status", ["processing", "analyzing"]);

        const activeWorkerCount = activeWorkers?.length || 0;
        const workerLimit = getWorkerLimit(plan);
        const availableWorkers = getRemainingWorkerCapacity(
          plan,
          activeWorkerCount,
        );

        console.log(
          `👷 [CALLBACK] Project ${session.project_id} (${plan}): ${activeWorkerCount}/${workerLimit} workers active`,
        );

        // Check usage limits
        const billingPeriod = getBillingPeriod(projectData);
        const { data: periodSessions } = await supabase
          .from("sessions")
          .select("video_duration")
          .eq("project_id", session.project_id)
          .eq("status", "analyzed")
          .gte("analyzed_at", billingPeriod.start.toISOString())
          .lte("analyzed_at", billingPeriod.end.toISOString());

        const currentUsage = calculateTotalUsage(periodSessions || []);
        const sessionDuration = successData.video_duration || 0;

        console.log(
          `⏱️ [CALLBACK] Project ${session.project_id}: Used ${formatSecondsToHours(currentUsage)}, Session duration: ${sessionDuration}s`,
        );

        if (
          availableWorkers > 0 &&
          hasRemainingAllowance(plan, currentUsage, sessionDuration)
        ) {
          // Trigger analysis
          try {
            console.log(
              `🎯 [CALLBACK] Triggering analysis for session ${session.id}`,
            );
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_URL}/jobs/analyze`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.CRON_SECRET}`,
                },
                body: JSON.stringify({ session_id: session.id }),
              },
            );

            if (response.ok) {
              console.log(
                `✅ [CALLBACK] Successfully triggered analysis for session ${session.id}`,
              );
            } else {
              console.error(
                `⚠️ [CALLBACK] Analyze trigger returned ${response.status} for session ${session.id}`,
              );
            }
          } catch (error) {
            console.error(
              `❌ [CALLBACK] Error triggering analysis for session ${session.id}:`,
              error,
            );
            Sentry.captureException(error, {
              tags: { job: "callback", step: "trigger_analyze" },
              extra: { sessionId: session.id },
            });
          }
        } else {
          if (availableWorkers <= 0) {
            console.log(
              `⚠️ [CALLBACK] Skipping analysis for session ${session.id} - no available workers`,
            );
          } else {
            console.log(
              `⚠️ [CALLBACK] Skipping analysis for session ${session.id} - would exceed usage limits`,
            );
          }
        }
      } else {
        console.error(
          `❌ [CALLBACK] Could not fetch project data for analysis trigger`,
        );
      }

      // Remove revalidatePath - using realtime channels now

      return NextResponse.json({
        success: true,
        session_id: session.id,
        message: "Session updated successfully",
      });
    } else {
      // Handle failed processing
      const errorData = payload as ErrorPayload;
      console.error(`❌ [CALLBACK] Processing failed:`, errorData.error);

      // Try to find and update session to failed status
      // Check if error payload contains recording_id
      if ("recording_id" in errorData && errorData.recording_id) {
        const { data: session, error: findError } = await supabase
          .from("sessions")
          .select("id")
          .eq("recording_id", errorData.recording_id)
          .eq("status", "processing")
          .single();

        if (session && !findError) {
          // Update session to failed status
          const { error: updateError } = await supabase
            .from("sessions")
            .update({ status: "failed" })
            .eq("id", session.id);

          if (updateError) {
            console.error(
              `❌ [CALLBACK] Failed to update session to failed status:`,
              updateError,
            );
          } else {
            console.log(
              `⚠️ [CALLBACK] Updated session ${session.id} to failed status due to processing error`,
            );
          }
        } else {
          console.error(
            `⚠️ [CALLBACK] Unable to find session for recording ${errorData.recording_id}`,
          );
        }
      } else {
        console.error(
          `⚠️ [CALLBACK] No recording_id in error payload, unable to update session`,
        );
      }

      // Log the error for investigation
      Sentry.captureException(
        new Error(`Cloud processing failed: ${errorData.error}`),
        {
          tags: { job: "callback", type: "processing_failed" },
          extra: { payload: errorData },
        },
      );

      return NextResponse.json(
        {
          success: false,
          error: errorData.error,
        },
        { status: 200 },
      ); // Return 200 to acknowledge receipt
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`💥 [CALLBACK] Failed to process callback:`, error);

    Sentry.captureException(error, {
      tags: { job: "callback" },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
