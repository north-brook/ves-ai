import { NextRequest, NextResponse } from "next/server";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
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
        project: "ves-ai",
        location: "us-central1",
      });

      console.log(`🤖 [ANALYZE] AI video analysis`);
      console.log(`   Video to analyze: ${session.video_url}`);
      console.log(`   Embed URL: ${session.embed_url}`);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: createUserContent([
          createPartFromUri(session.video_url, "video/webm"),
          "You are analyzing a user session recording from a web application. Your goal is to identify bugs, UX friction points, user behavior patterns, and opportunities for product improvement. Watch the entire session carefully, noting user interactions, hesitations, errors, successful flows, and abandoned actions. Focus on providing actionable insights that product teams can use to improve the user experience. Be specific about what happened, when it happened, and why it matters. Consider both technical issues (bugs, errors, performance) and user experience issues (confusion, friction, inefficient workflows).",
        ]),
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysis: {
                type: Type.STRING,
                description:
                  "A comprehensive analysis of the user session using markdown formatting with clear headings (## for main sections, ### for subsections) and bullet points. Structure your analysis with these sections: ## User Journey Overview - Describe the user's path and apparent goals. ## Technical Issues - List any bugs, errors, console warnings, failed API calls, or performance problems as bullet points with specific details. ## UX Friction Points - Use bullet points to identify confusion, hesitation, repeated actions, abandoned flows, or inefficient patterns. ## Feature Usage - Note which features worked well vs struggled with. ## Opportunities - Bullet point list of specific improvements based on observed pain points. ## User Success - Evaluate goal achievement and blockers. Use **bold** for emphasis, `code` for technical terms, and include timestamps where relevant. Ensure proper markdown formatting with consistent heading levels and bullet point structure.",
              },
              tldr: {
                type: Type.STRING,
                description:
                  "A concise 1-2 sentence summary in markdown format. Use **bold** to emphasize key points, *italics* for secondary details, or bullet points if listing multiple brief items. Include the user's main goal, outcome (success/failure), and the most critical issue or insight. Focus on actionable takeaways. Keep under 200 characters while using markdown formatting effectively for readability.",
              },
              tags: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                  description:
                    "A relevant tag for categorizing this session. Use lowercase, hyphenated format. Examples: 'checkout-flow', 'onboarding', 'dashboard', 'bug-critical', 'ux-friction', 'performance-issue', 'user-confusion', 'feature-discovery', 'mobile-experience', 'form-error', 'navigation-issue', 'search-functionality', 'payment-flow', 'account-settings'. Choose tags that help filter and group similar sessions.",
                },
              },
              name: {
                type: Type.STRING,
                description:
                  "A descriptive, scannable title for this session that captures the main user action and outcome. Format: [Action] + [Context/Feature] + [Outcome/Issue]. Examples: 'User completes checkout after payment retry', 'New user abandons onboarding at email verification', 'Dashboard filtering causes repeated errors', 'Successful project creation with team invite'. Keep it under 10 words, action-oriented, and specific enough to understand the session's key event without watching it.",
              },
            },
            required: ["analysis", "tldr", "tags", "name"],
            propertyOrdering: ["analysis", "tldr", "tags", "name"],
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

      const { error: analysisError } = await supabase
        .from("sessions")
        .update({
          name,
          status: "analyzed",
          analysis,
          tldr,
          tags,
        })
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
