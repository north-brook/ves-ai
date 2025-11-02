import { ReplaySuccess } from "@/cloud/src/types";
import { writeDebugFile } from "@/lib/debug/helper";
import adminSupabase from "@/lib/supabase/admin";
import { Database, Session, SessionDetectedIssue } from "@/types";
import { openai } from "@ai-sdk/openai";
import {
  createPartFromUri,
  createUserContent,
  GoogleGenAI,
} from "@google/genai";
import { embed } from "ai";
import { FatalError } from "workflow";
import constructContext from "./context";
import { ANALYZE_SESSION_SCHEMA, ANALYZE_SESSION_SYSTEM } from "./prompts";

export async function analyzeSession(
  sessionId: string,
  replay: ReplaySuccess,
): Promise<Session> {
  "use step";

  console.log(
    `🧠 [ANALYZE SESSION] Starting analysis for session ${sessionId}`,
  );
  const supabase = adminSupabase();

  // Update session with video data (embed_url already saved during pull)
  const updateData: Database["public"]["Tables"]["sessions"]["Update"] = {
    status: "processed",
    video_uri: replay.video_uri,
    video_duration: replay.video_duration,
    event_uri: replay.events_uri,
  };

  const { error: updateSessionError } = await supabase
    .from("sessions")
    .update(updateData)
    .eq("id", sessionId);

  console.log(`✨ [ANALYZE SESSION] Successfully updated session ${sessionId}`);
  console.log(`   Status: processing → processed`);
  console.log(`   Video: ${replay.video_uri}`);
  console.log(`   Duration: ${replay.video_duration}s`);
  console.log(`   Events: ${replay.events_uri}`);

  if (updateSessionError) {
    console.error(
      `❌ [CALLBACK] Failed to update session:`,
      updateSessionError,
    );
    throw updateSessionError;
  }

  // Fetch session details
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select(
      "id,external_id,status,event_uri,video_uri,video_duration,project:projects(id,name,slug,plan,subscribed_at,created_at)",
    )
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    console.error(
      `❌ [ANALYZE SESSION] Session not found: ${sessionId}`,
      sessionError,
    );
    throw new FatalError("Session not found");
  }

  console.log(`📋 [ANALYZE SESSION] Session details:`);
  console.log(`   External ID: ${session.external_id}`);
  console.log(`   Status: ${session.status}`);
  console.log(`   Project: ${session.project.name}`);
  console.log(`   Video URL: ${session.video_uri}`);
  console.log(`   Duration: ${session.video_duration}s`);

  // Check if session is in processed state
  if (session.status === "pending" || session.status === "processing") {
    console.warn(
      `⚠️ [ANALYZE SESSION] Session ${sessionId} is not processed (status: ${session.status})`,
    );
    throw new FatalError(
      `Session is not processed (status: ${session.status})`,
    );
  }

  if (!session.video_uri) {
    console.error(`❌ [ANALYZE SESSION] Session ${sessionId} has no video URL`);
    throw new FatalError("Session has no video URL");
  }

  if (!session.event_uri) {
    console.error(
      `❌ [ANALYZE SESSION] Session ${sessionId} has no events URL`,
    );
    throw new FatalError("Session has no events URL");
  }

  // Update session status to analyzing
  console.log(
    `🔄 [ANALYZE SESSION] Updating session ${sessionId} to analyzing status`,
  );
  const { error: updateError } = await supabase
    .from("sessions")
    .update({ status: "analyzing", analyzed_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (updateError) {
    console.error(
      `❌ [ANALYZE SESSION] Failed to update session status:`,
      updateError,
    );
    throw new Error(updateError.message);
  }

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

  console.log(`🤖 [ANALYZE SESSION] AI video analysis`);
  console.log(`   Video to analyze: ${session.video_uri}`);
  console.log(`   Events to analyze: ${session.event_uri}`);

  const context = await constructContext({
    eventUri: session.event_uri,
    sessionId: session.id,
  });

  // Prepare the user prompt for debugging
  const userPromptContent = `Video: ${session.video_uri}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: [
      createUserContent(ANALYZE_SESSION_SYSTEM),
      createUserContent([
        createPartFromUri(session.video_uri, "video/webm"),
        context,
      ]),
    ],
    config: {
      thinkingConfig: {
        thinkingBudget: 32768,
      },
      responseMimeType: "application/json",
      responseSchema: ANALYZE_SESSION_SCHEMA,
    },
  });

  // Write debug file for main analysis
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await writeDebugFile(`debug-${timestamp}-analyze-session-${sessionId}.txt`, {
    timestamp: new Date().toISOString(),
    job: "analyze-session",
    id: sessionId,
    systemPrompt: ANALYZE_SESSION_SYSTEM,
    userPrompt: userPromptContent,
    modelResponse: response?.text || "No response",
  });

  if (!response?.text) {
    console.error(`❌ [ANALYZE SESSION] Failed to get response from AI`);
    throw new Error("Failed to get response from AI");
  }

  let parsedResponse: {
    valid_video: boolean;
    notes: string | null;
    analysis: {
      story: string;
      features: string[];
      name: string;
      detected_issues: SessionDetectedIssue[];
      health: string;
      score: number;
    } | null;
  };

  try {
    parsedResponse = JSON.parse(response.text);
  } catch (error) {
    console.error(`❌ [ANALYZE SESSION] Failed to parse JSON:`, error);
    throw new Error("Failed to parse JSON");
  }

  // Check if the session is valid
  if (!parsedResponse.valid_video) {
    console.error(`❌ [ANALYZE SESSION] Invalid session detected`);
    throw new Error("Invalid session detected");
  }

  // Valid session - validate the analysis data
  const data = parsedResponse.analysis;
  if (!data || !data.story || !data.name || !data.detected_issues) {
    console.error(`❌ [ANALYZE SESSION] Invalid analysis data:`, data);
    throw new Error("Invalid analysis data");
  }

  // embed the session name, pages, and story
  const { embedding } = await embed({
    model: openai.textEmbeddingModel("text-embedding-3-small"),
    value: `${data.name}\n${data.features.join(", ")}`,
  });

  const { data: analyzedSession, error: analysisError } = await supabase
    .from("sessions")
    .update({
      name: data.name,
      status: "analyzed",
      story: data.story,
      features: data.features,
      detected_issues: data.detected_issues,
      health: data.health,
      score: data.score,
      embedding: embedding as unknown as string,
    })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (analysisError) {
    console.error(
      `❌ [ANALYZE SESSION] Failed to update analysis:`,
      analysisError,
    );
    throw analysisError;
  }

  console.log(
    `✨ [ANALYZE SESSION] Successfully analyzed session ${sessionId}`,
  );

  return analyzedSession;
}
