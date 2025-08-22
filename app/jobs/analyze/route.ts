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
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

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
        "id,external_id,status,events,video_uri,video_duration,project:projects(id,name,slug,plan,subscribed_at,created_at)",
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

    if (!session.events) {
      console.error(`❌ [ANALYZE] Session ${session_id} has no events`);
      return NextResponse.json(
        {
          error: "Session has no events",
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

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: createUserContent([
          createPartFromUri(session.video_uri, "video/webm"),
          session.events.map((e) => `${e.time} - ${e.description}`).join("\n"),
          "You are analyzing a user session recording from a web application to understand and recount the user's story.\n\nFirst, verify that the video contains a valid session replay.\n\nIf the video is invalid (corrupted, doesn't load, doesn't contain a replay, or the replay doesn't actually play):\n- Return: {valid_video: false, analysis: null}\n\nIf the session replay is valid and playable:\n- Return: {valid_video: true, analysis: {story, features, name}}\n\nFor valid sessions:\nThe session replay will play through periods of user activity, skipping periods of user inactivity. Keep in mind that you cannot see external web pages (eg. Google authentication) and that the user may toggle between different tabs in the same replay.\n\nYour primary goal is to precisely and qualitatively recount the user's story through the product. Focus on:\n\n1. **User Journey Path**: Document the exact sequence of pages, features, and interactions the user navigated through\n2. **Inferred Intent**: What was the user trying to accomplish? What goals were they pursuing?\n3. **Friction & Bugs**: What specific obstacles, errors, or confusing moments did they encounter?\n4. **User Success**: How successful was the user in achieving their apparent goals?\n5. **Product Effectiveness**: How well did the product support the user's journey and intent?\n\nBegin by carefully observing user behaviors without immediately assuming problems. Many actions have multiple plausible explanations - a user who adds items to cart but doesn't check out might be browsing, comparing options, or saving for later, not necessarily encountering a bug. A user who hesitates might be reading content or thinking, not confused. Think deeply about plausible explanations for user behavior and avoid jumping to conclusions.\n\nWatch the entire session carefully, noting the complete narrative arc of the user's experience. Be specific about what happened, when it happened, and how it fits into the overall story of their session.",
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
                  story: {
                    type: Type.STRING,
                    description:
                      "A comprehensive user story using markdown formatting that recounts the session narrative. Structure with these sections: ## User Journey - Chronologically describe the exact path the user took through the product, including all pages visited, features engaged with, and actions taken. ## Intent & Goals - What was the user trying to accomplish? Provide your best inference of their objectives based on their behavior patterns. ## Friction Points & Bugs - Detail any specific issues, errors, confusion, or obstacles the user encountered. Be precise about when and where these occurred. ## Success & Effectiveness - Assess how successful the user was in achieving their apparent goals and how effectively the product supported their journey. Was the user able to complete their intended tasks? ## Key Insights - What does this session reveal about the product experience? What patterns or opportunities for improvement emerge from this user's story? Use **bold** for emphasis and ensure proper markdown formatting.",
                  },
                  features: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                      description:
                        "A product feature the user engaged with during their session. Use title case format (e.g., 'Product Catalog', 'Shopping Cart', 'User Dashboard'). Focus on identifying the specific product capabilities and functionalities the user interacted with. Examples: 'Product Creator', 'Lesson Planner', 'Checkout Flow', 'Search Filters', 'User Profile', 'Analytics Dashboard', 'Email Composer', 'Payment Processing', 'Inventory Management', 'Content Editor', 'Navigation Menu', 'Settings Panel'. Choose features that represent the actual product modules and tools the user utilized.",
                    },
                  },
                  name: {
                    type: Type.STRING,
                    description:
                      "A sentence case (no punctuation) concise summary of the user story. Focus on capturing the essence of what the user attempted and what happened. Examples: 'User successfully completes purchase after address validation issue', 'New visitor explores pricing but leaves without signing up', 'Customer encounters repeated errors while configuring dashboard filters', 'User navigates complex checkout flow and abandons at payment'. Keep it under 10 words and make it a complete narrative summary without any punctuation marks.",
                  },
                },
                required: ["observations", "story", "features", "name"],
                propertyOrdering: ["observations", "story", "features", "name"],
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
