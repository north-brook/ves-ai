import { NextRequest, NextResponse } from "next/server";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import {
  createPartFromUri,
  createUserContent,
  GoogleGenAI,
} from "@google/genai";
import nextJobs from "../run/next-job";
import { Session } from "@/types";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_RESPONSE_SCHEMA,
} from "@/app/jobs/analyze/prompts";
import constructContext from "./context";

export type AnalyzeJobRequest = {
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

    const body: AnalyzeJobRequest = await request.json();
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
        "id,external_id,status,event_uri,video_uri,video_duration,project:projects(id,name,slug,plan,subscribed_at,created_at)",
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
    console.log(`   External ID: ${session.external_id}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Project: ${session.project.name}`);
    console.log(`   Video URL: ${session.video_uri}`);
    console.log(`   Duration: ${session.video_duration}s`);

    // Check if session is in processed state
    if (session.status === "pending" || session.status === "processing") {
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

    if (!session.video_uri) {
      console.error(`❌ [ANALYZE] Session ${session_id} has no video URL`);
      return NextResponse.json(
        {
          error: "Session has no video URL",
        },
        { status: 400 },
      );
    }

    if (!session.event_uri) {
      console.error(`❌ [ANALYZE] Session ${session_id} has no events URL`);
      return NextResponse.json(
        {
          error: "Session has no events URL",
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
      .update({ status: "analyzing", analyzed_at: new Date().toISOString() })
      .eq("id", session_id);

    if (updateError) {
      console.error(
        `❌ [ANALYZE] Failed to update session status:`,
        updateError,
      );
      throw updateError;
    }

    try {
      const ai = new GoogleGenAI({
        vertexai: true,
        project: process.env.GCP_PROJECT_ID,
        location: process.env.GCP_LOCATION,
        googleAuthOptions: {
          credentials: {
            client_email: process.env.GCP_CLIENT_EMAIL,
            private_key: process.env.GCP_PRIVATE_KEY,
          },
        },
      });

      console.log(`🤖 [ANALYZE] AI video analysis`);
      console.log(`   Video to analyze: ${session.video_uri}`);
      console.log(`   Events to analyze: ${session.event_uri}`);

      const context = await constructContext({
        eventUri: session.event_uri,
        sessionId: session.id,
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: createUserContent([
          createPartFromUri(session.video_uri, "video/webm"),
          context,
          ANALYSIS_SYSTEM_PROMPT,
        ]),
        config: {
          thinkingConfig: {
            thinkingBudget: 32768,
          },
          responseMimeType: "application/json",
          responseSchema: ANALYSIS_RESPONSE_SCHEMA,
        },
      });

      if (!response?.text) {
        console.error(`❌ [ANALYZE] Failed to get response from AI`);
        return NextResponse.json(
          { error: "Failed to get response from AI" },
          { status: 500 },
        );
      }

      let parsedResponse: {
        valid_video: boolean;
        notes: string | null;
        analysis: Pick<
          Session,
          "story" | "features" | "name" | "observations"
        > | null;
      };

      try {
        parsedResponse = JSON.parse(response.text);
      } catch (error) {
        console.error(`❌ [ANALYZE] Failed to parse JSON:`, error);
        return NextResponse.json(
          { error: "Failed to parse JSON" },
          { status: 500 },
        );
      }

      // Check if the session is valid
      if (!parsedResponse.valid_video) {
        console.error(`❌ [ANALYZE] Invalid session detected`);
        throw new Error("Invalid session detected");
      }

      // Valid session - validate the analysis data
      const data = parsedResponse.analysis;
      if (!data || !data.story || !data.features || !data.name) {
        console.error(`❌ [ANALYZE] Invalid analysis data:`, data);
        return NextResponse.json(
          { error: "Invalid analysis data" },
          { status: 500 },
        );
      }

      // embed the session name, features, and story
      const { embedding } = await embed({
        model: openai.textEmbeddingModel("text-embedding-3-small"),
        value: `${data.name}\n${data.features.join(", ")}\n${data.story}`,
      });

      const { error: analysisError } = await supabase
        .from("sessions")
        .update({
          name: data.name,
          status: "analyzed",
          story: data.story,
          features: data.features,
          observations: data.observations,
          embedding: embedding as unknown as string,
        })
        .eq("id", session_id);

      if (analysisError) {
        console.error(`❌ [ANALYZE] Failed to update analysis:`, analysisError);
        throw analysisError;
      }

      console.log(`✨ [ANALYZE] Successfully analyzed session ${session_id}`);

      // Trigger processing for next pending session in the project
      console.log(`🔍 [ANALYZE] Checking for next pending session to process`);

      await nextJobs(session.project.id, 1);

      return NextResponse.json({
        success: true,
        session_id,
        message: "Analysis completed",
        ...data,
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
