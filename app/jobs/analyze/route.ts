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
import {
  createPartFromUri,
  createUserContent,
  GoogleGenAI,
  Type,
} from "@google/genai";
import nextJobs from "../run/next-job";

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
      const ai = new GoogleGenAI({});

      console.log(`🤖 [ANALYZE] AI video analysis`);
      console.log(`   Video to analyze: ${session.video_url}`);
      console.log(`   Embed URL: ${session.embed_url}`);

      const videoFile = await ai.files.upload({
        file: session.video_url,
        config: { mimeType: "video/webm" },
      });

      if (!videoFile.uri || !videoFile.mimeType) {
        console.error(`❌ [ANALYZE] Failed to upload video file`);
        return NextResponse.json(
          { error: "Failed to upload video file" },
          { status: 500 },
        );
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: createUserContent([
          createPartFromUri(videoFile.uri, videoFile.mimeType),
          "",
        ]),
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: Type.OBJECT,
              properties: {
                analysis: {
                  type: Type.STRING,
                  description: "",
                },
                tldr: {
                  type: Type.STRING,
                  description: "A TL;DR of the analysis",
                },
                tags: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.STRING,
                    description: "A tag for the session",
                  },
                },
                name: {
                  type: Type.STRING,
                  description: "A name for the session",
                },
              },
              required: ["analysis", "tldr", "tags", "name"],
              propertyOrdering: ["analysis", "tldr", "tags", "name"],
            },
          },
        },
      });

      if (!response?.text) {
        console.error(`❌ [ANALYZE] Failed to get response from AI`);
        return NextResponse.json(
          { error: "Failed to get response from AI" },
          { status: 500 },
        );
      }

      let analysis: string;
      let tldr: string;
      let tags: string[];
      let name: string;

      try {
        const json = JSON.parse(response.text);
        analysis = json.analysis;
        tldr = json.tldr;
        tags = json.tags;
        name = json.name;
      } catch (error) {
        console.error(`❌ [ANALYZE] Failed to parse JSON:`, error);
        return NextResponse.json(
          { error: "Failed to parse JSON" },
          { status: 500 },
        );
      }

      // Update session with analysis results
      const analysisUpdate: Database["public"]["Tables"]["sessions"]["Update"] =
        {
          name: name,
          status: "analyzed",
          analysis: analysis,
          analyzed_at: new Date().toISOString(),
          tags: tags,
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
      console.log(`   TLDR: ${tldr}`);
      console.log(`   Tags: ${tags.join(", ")}`);

      // Trigger processing for next pending session in the project
      console.log(`🔍 [ANALYZE] Checking for next pending session to process`);

      await nextJobs(session.project.id, 1);

      return NextResponse.json({
        success: true,
        session_id,
        message: "Analysis completed",
        analysis: analysis,
        tldr: tldr,
        tags: tags,
        name: name,
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
