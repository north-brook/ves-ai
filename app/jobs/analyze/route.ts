import { NextRequest, NextResponse } from "next/server";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import { Database } from "@/types";
import {
  getWorkerLimit,
  getBillingPeriod,
  calculateTotalUsage,
  getRemainingWorkerCapacity,
  hasRemainingAllowance,
} from "@/lib/limits";

type AnalyzeRequest = {
  session_id: string;
};

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("🚫 Unauthorized analyze job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AnalyzeRequest = await request.json();
    const { session_id } = body;

    if (!session_id) {
      console.error("❌ [ANALYZE] Missing session_id");
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 },
      );
    }

    console.log(`🧠 [ANALYZE] Starting analysis for session ${session_id}`);
    const supabase = adminSupabase();

    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select(
        "id,recording_id,status,video_url,video_duration,embed_url,project:projects(id,name,slug,plan,subscribed_at,created_at)",
      )
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      console.error(
        `❌ [ANALYZE] Session not found: ${session_id}`,
        sessionError,
      );
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    console.log(`📋 [ANALYZE] Session details:`);
    console.log(`   Recording: ${session.recording_id}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Project: ${session.project.name}`);
    console.log(`   Video URL: ${session.video_url}`);
    console.log(`   Duration: ${session.video_duration}s`);

    // Check if session is in processed state
    if (session.status !== "processed") {
      console.warn(
        `⚠️ [ANALYZE] Session ${session_id} is not processed (status: ${session.status})`,
      );
      return NextResponse.json(
        {
          error: `Session is not processed (status: ${session.status})`,
        },
        { status: 400 },
      );
    }

    if (!session.video_url) {
      console.error(`❌ [ANALYZE] Session ${session_id} has no video URL`);
      return NextResponse.json(
        {
          error: "Session has no video URL",
        },
        { status: 400 },
      );
    }

    // Update session status to analyzing
    console.log(
      `🔄 [ANALYZE] Updating session ${session_id} to analyzing status`,
    );
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ status: "analyzing" })
      .eq("id", session_id);

    if (updateError) {
      console.error(
        `❌ [ANALYZE] Failed to update session status:`,
        updateError,
      );
      throw updateError;
    }

    try {
      // TODO: Implement AI analysis of the video recording
      console.log(`🤖 [ANALYZE] TODO: Implement AI video analysis`);
      console.log(`   Video to analyze: ${session.video_url}`);
      console.log(`   Embed URL: ${session.embed_url}`);

      // Placeholder for AI analysis
      // This is where you would:
      // 1. Download or stream the video
      // 2. Send it to an AI service (OpenAI, Claude, etc.)
      // 3. Get insights about the session
      // 4. Generate a summary and tags

      const placeholderAnalysis = {
        summary: "AI analysis not yet implemented",
        insights: [],
        tags: ["pending-analysis"],
        analyzed_at: new Date().toISOString(),
      };

      // For now, we'll just mark it as analyzed with placeholder data
      console.log(`⏸️ [ANALYZE] Skipping actual AI analysis (not implemented)`);

      // Update session with analysis results
      const analysisUpdate: Database["public"]["Tables"]["sessions"]["Update"] =
        {
          name: "Analyzed Session",
          status: "analyzed",
          analysis: `# Session Analysis Report

## Executive Summary
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

## Key Findings
- **User Engagement**: Excepteur sint occaecat cupidatat non proident
- **Navigation Patterns**: Sunt in culpa qui officia deserunt mollit anim
- **Performance Issues**: Duis aute irure dolor in reprehenderit in voluptate

## Detailed Analysis

### User Behavior
Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

### Technical Observations
- Lorem ipsum dolor sit amet consectetur
- Adipiscing elit sed do eiusmod tempor
- Incididunt ut labore et dolore magna aliqua

### Recommendations
1. **Immediate Actions**: Ut enim ad minim veniam quis nostrud
2. **Short-term Improvements**: Exercitation ullamco laboris nisi ut aliquip
3. **Long-term Strategy**: Ex ea commodo consequat duis aute irure

## Conclusion
Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.`,
          analyzed_at: placeholderAnalysis.analyzed_at,
          tags: placeholderAnalysis.tags,
        };

      const { error: analysisError } = await supabase
        .from("sessions")
        .update(analysisUpdate)
        .eq("id", session_id);

      if (analysisError) {
        console.error(`❌ [ANALYZE] Failed to update analysis:`, analysisError);
        throw analysisError;
      }

      console.log(
        `✨ [ANALYZE] Successfully marked session ${session_id} as analyzed`,
      );
      console.log(`   Status: analyzing → analyzed`);
      console.log(`   Analysis: ${placeholderAnalysis.summary}`);
      console.log(`   Tags: ${placeholderAnalysis.tags.join(", ")}`);

      // Trigger processing for next pending session in the project
      console.log(`🔍 [ANALYZE] Checking for next pending session to process`);

      const plan = session.project.plan;

      // Check worker limits (now we have one less active worker since we just finished)
      const { data: activeWorkers } = await supabase
        .from("sessions")
        .select("id")
        .eq("project_id", session.project.id)
        .in("status", ["processing", "analyzing"]);

      const activeWorkerCount = activeWorkers?.length || 0;
      const workerLimit = getWorkerLimit(plan);
      const availableWorkers = getRemainingWorkerCapacity(
        plan,
        activeWorkerCount,
      );

      console.log(
        `👷 [ANALYZE] Project ${session.project.id} (${plan}): ${activeWorkerCount}/${workerLimit} workers active`,
      );

      if (availableWorkers > 0) {
        // Check usage limits
        const billingPeriod = getBillingPeriod(session.project);
        const { data: periodSessions } = await supabase
          .from("sessions")
          .select("video_duration")
          .eq("project_id", session.project.id)
          .eq("status", "analyzed")
          .gte("analyzed_at", billingPeriod.start.toISOString())
          .lte("analyzed_at", billingPeriod.end.toISOString());

        const currentUsage = calculateTotalUsage(periodSessions || []);

        if (hasRemainingAllowance(plan, currentUsage)) {
          // Find next pending session
          const { data: nextSession } = await supabase
            .from("sessions")
            .select("id")
            .eq("project_id", session.project.id)
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(1)
            .single();

          if (nextSession) {
            // Trigger processing for next session
            try {
              console.log(
                `🎯 [ANALYZE] Triggering processing for next session ${nextSession.id}`,
              );
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_URL}/jobs/process`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.CRON_SECRET}`,
                  },
                  body: JSON.stringify({ session_id: nextSession.id }),
                },
              );

              if (response.ok) {
                console.log(
                  `✅ [ANALYZE] Successfully triggered processing for session ${nextSession.id}`,
                );
              } else {
                console.error(
                  `⚠️ [ANALYZE] Process trigger returned ${response.status} for session ${nextSession.id}`,
                );
              }
            } catch (error) {
              console.error(
                `❌ [ANALYZE] Error triggering process for session ${nextSession.id}:`,
                error,
              );
              Sentry.captureException(error, {
                tags: { job: "analyze", step: "trigger_next_process" },
                extra: { sessionId: nextSession.id },
              });
            }
          } else {
            console.log(
              `💭 [ANALYZE] No pending sessions found for project ${session.project.id}`,
            );
          }
        } else {
          console.log(
            `⚠️ [ANALYZE] Project ${session.project.id} has reached usage limits`,
          );
        }
      } else {
        console.log(
          `⚠️ [ANALYZE] Project ${session.project.id} has no available workers`,
        );
      }

      return NextResponse.json({
        success: true,
        session_id,
        message: "Analysis completed (placeholder)",
        analysis: placeholderAnalysis,
      });
    } catch (analysisError) {
      console.error(`❌ [ANALYZE] Analysis failed:`, analysisError);

      // Update status to failed
      await supabase
        .from("sessions")
        .update({ status: "failed" })
        .eq("id", session_id);

      throw analysisError;
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`💥 [ANALYZE] Job failed:`, error);

    // Try to update session status to failed
    try {
      const body = await request.json().catch(() => ({}));
      if (body.session_id) {
        const supabase = adminSupabase();
        await supabase
          .from("sessions")
          .update({ status: "failed" })
          .eq("id", body.session_id);
        console.log(
          `⚠️ [ANALYZE] Updated session ${body.session_id} to failed status`,
        );
      }
    } catch (updateError) {
      console.error(
        `❌ [ANALYZE] Failed to update session to failed status:`,
        updateError,
      );
    }

    Sentry.captureException(error, {
      tags: { job: "analyze" },
      extra: {
        session_id: (await request.json().catch(() => ({}))).session_id,
      },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
