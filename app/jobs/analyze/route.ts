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
import { Session } from "@/types";

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
          "You are analyzing a user session recording from a web application via a PostHog embed.\n\nFirst, verify that the video contains a valid session replay.\n\nIf the video is invalid (corrupted, doesn't load, doesn't contain a replay, or the replay doesn't actually play):\n- Return: {valid_video: false, analysis: null}\n\nIf the session replay is valid and playable:\n- Return: {valid_video: true, analysis: {observations, synthesis, tldr, tags, name}}\n\nFor valid sessions:\nThe session replay will buffer at first, then play through periods of user activity, skipping periods of user inactivity. You can see the progress of the replay on the bottom.\n\nBegin by carefully observing user behaviors without immediately assuming problems. Many actions have multiple plausible explanations - a user who adds items to cart but doesn't check out might be browsing, comparing options, or saving for later, not necessarily encountering a bug. A user who hesitates might be reading content or thinking, not confused.\n\nYour goal is to identify bugs, UX friction points, user behavior patterns, and opportunities for product improvement. Watch the entire session carefully, noting user interactions, hesitations, errors, successful flows, and abandoned actions. For each observation, think deeply about why the user might be behaving this way before concluding there's an issue.\n\nFocus on providing actionable insights that product teams can use to improve the user experience. Be specific about what happened, when it happened, and why it matters. Consider both technical issues (bugs, errors, performance) and user experience issues (confusion, friction, inefficient workflows).",
        ]),
        config: {
          thinkingConfig: {
            thinkingBudget: 32768,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              valid_video: {
                type: Type.BOOLEAN,
                description:
                  "Whether the video contains a valid, playable session replay. Set to false if the video is corrupted, doesn't load, shows an error, or doesn't contain an actual replay.",
              },
              analysis: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  observations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        observation: {
                          type: Type.STRING,
                          description:
                            "A specific behavior or action you observed in the session. Be descriptive and precise about what happened.",
                        },
                        explanation: {
                          type: Type.STRING,
                          description:
                            "A plausible explanation for why this behavior occurred. Consider multiple possibilities - don't jump to conclusions. For example, if a user added items to cart but didn't checkout, they might be browsing, comparing prices, or saving for later - not necessarily encountering a checkout bug.",
                        },
                        suggestion: {
                          type: Type.STRING,
                          description:
                            "A specific, actionable suggestion for improvement based on this observation. Focus on what could be changed to better support the user's apparent intent.",
                        },
                        confidence: {
                          type: Type.STRING,
                          enum: ["low", "medium", "high"],
                          description:
                            "Your confidence level in this observation and its interpretation. High = clear pattern with obvious cause, Medium = likely pattern but multiple explanations possible, Low = unclear pattern or speculative interpretation.",
                        },
                        urgency: {
                          type: Type.STRING,
                          enum: ["low", "medium", "high"],
                          description:
                            "The urgency of addressing this issue. High = blocking user goals or causing errors, Medium = creating friction but users can work around it, Low = minor improvement opportunity.",
                        },
                      },
                      required: [
                        "observation",
                        "explanation",
                        "suggestion",
                        "confidence",
                        "urgency",
                      ],
                    },
                    description:
                      "An array of detailed observations from the session. Think deeply about user behavior - consider multiple explanations before concluding something is a bug. Users might be browsing, exploring, comparing options, or intentionally abandoning actions. Look for patterns in hesitation, repeated actions, successful flows, and abandoned tasks.",
                  },
                  synthesis: {
                    type: Type.STRING,
                    description:
                      "A synthesis of your observations into a cohesive narrative using markdown formatting. DO NOT repeat individual observations - instead, weave them into a story. Structure with these sections: ## Session Story - Tell the story of what the user was trying to accomplish and how their journey unfolded. Connect the dots between observations to form a narrative. ## Key Patterns - Identify recurring themes across multiple observations. What broader patterns emerge? Group related observations into meaningful insights. ## Impact Assessment - Based on the confidence and urgency levels of your observations, what are the most critical areas needing attention? Prioritize based on user impact. ## Strategic Recommendations - Synthesize your suggestions into 3-5 strategic recommendations that address multiple observations. Focus on systemic improvements rather than individual fixes. Use **bold** for emphasis and ensure proper markdown formatting.",
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
                required: ["observations", "synthesis", "tldr", "tags", "name"],
                propertyOrdering: [
                  "observations",
                  "synthesis",
                  "tldr",
                  "tags",
                  "name",
                ],
                description:
                  "The full analysis object. Only provided if valid_video is true, otherwise must be null.",
              },
            },
            required: ["valid_video", "analysis"],
            propertyOrdering: ["valid_video", "analysis"],
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

      let parsedResponse: {
        valid_video: boolean;
        notes: string | null;
        analysis: Pick<
          Session,
          "observations" | "synthesis" | "tldr" | "tags" | "name"
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
      if (
        !data ||
        !data.observations ||
        !data.synthesis ||
        !data.tldr ||
        !data.tags ||
        !data.name
      ) {
        console.error(`❌ [ANALYZE] Invalid analysis data:`, data);
        return NextResponse.json(
          { error: "Invalid analysis data" },
          { status: 500 },
        );
      }

      const { error: analysisError } = await supabase
        .from("sessions")
        .update({
          name: data.name,
          status: "analyzed",
          observations: data.observations,
          synthesis: data.synthesis,
          tldr: data.tldr,
          tags: data.tags,
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
      console.log(`   Observations: ${data.observations.length}`);
      console.log(`   TLDR: ${data.tldr}`);
      console.log(`   Tags: ${data.tags?.join(", ")}`);

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
