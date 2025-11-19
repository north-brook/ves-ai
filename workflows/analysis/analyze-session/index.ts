import { ReplaySuccess } from "@/cloud/src/types";
import { writeDebugFile } from "@/lib/debug/helper";
import embed from "@/lib/embed";
import adminSupabase from "@/lib/supabase/admin";
import { Database, Session, SessionDetectedIssue } from "@/types";
import {
  createPartFromUri,
  createUserContent,
  GoogleGenAI,
  MediaResolution,
  ThinkingLevel,
} from "@google/genai";
import constructContext from "./context";
import { ANALYZE_SESSION_SCHEMA, ANALYZE_SESSION_SYSTEM } from "./prompts";
import * as Sentry from "@sentry/nextjs";

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
    Sentry.captureException(updateSessionError, {
      tags: { job: "analyzeSession", step: "analyzeSession" },
      extra: { sessionId, replay },
    });
    throw new Error("Failed to update session");
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
    const error = sessionError || new Error("Session not found");
    console.error(
      `❌ [ANALYZE SESSION] Session not found: ${sessionId}`,
      error,
    );
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeSession" },
      extra: { sessionId },
    });
    throw new Error(error.message || "Session not found");
  }

  console.log(`📋 [ANALYZE SESSION] Session details:`);
  console.log(`   External ID: ${session.external_id}`);
  console.log(`   Status: ${session.status}`);
  console.log(`   Project: ${session.project.name}`);
  console.log(`   Video URL: ${session.video_uri}`);
  console.log(`   Duration: ${session.video_duration}s`);

  // Check if session is in processed state
  if (session.status === "pending" || session.status === "processing") {
    const error = new Error(
      `Session is not processed (status: ${session.status})`,
    );
    console.warn(
      `⚠️ [ANALYZE SESSION] Session ${sessionId} is not processed (status: ${session.status})`,
    );
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeSession" },
      extra: { sessionId, status: session.status, projectId: session.project.id },
    });
    throw error;
  }

  if (!session.video_uri) {
    const error = new Error("Session has no video URL");
    console.error(`❌ [ANALYZE SESSION] Session ${sessionId} has no video URL`);
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeSession" },
      extra: { sessionId, projectId: session.project.id },
    });
    throw error;
  }

  if (!session.event_uri) {
    const error = new Error("Session has no events URL");
    console.error(
      `❌ [ANALYZE SESSION] Session ${sessionId} has no events URL`,
    );
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeSession" },
      extra: { sessionId, projectId: session.project.id },
    });
    throw error;
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
    Sentry.captureException(updateError, {
      tags: { job: "analyzeSession", step: "analyzeSession" },
      extra: { sessionId, projectId: session.project.id },
    });
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

  let context;
  let response;

  try {
    context = await constructContext({
      eventUri: session.event_uri,
      sessionId: session.id,
    });
  } catch (error) {
    console.error(`❌ [ANALYZE SESSION] Failed to construct context:`, error);
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeSession/constructContext" },
      extra: {
        sessionId,
        projectId: session.project.id,
        eventUri: session.event_uri,
      },
    });
    throw error;
  }

  // Prepare the user prompt for debugging
  const userPromptContent = `Video: ${session.video_uri}`;

  try {
    response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        createUserContent(ANALYZE_SESSION_SYSTEM),
        createUserContent([
          createPartFromUri(session.video_uri, "video/webm"),
          context,
        ]),
      ],
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
        responseMimeType: "application/json",
        responseSchema: ANALYZE_SESSION_SCHEMA,
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
      },
    });
  } catch (error) {
    console.error(`❌ [ANALYZE SESSION] AI analysis failed:`, error);
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeSession/ai" },
      extra: {
        sessionId,
        projectId: session.project.id,
        videoUri: session.video_uri,
        eventUri: session.event_uri,
      },
    });
    throw error;
  }

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
    const error = new Error("Failed to get response from AI");
    console.error(`❌ [ANALYZE SESSION] Failed to get response from AI`);
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeSession/ai" },
      extra: { sessionId, projectId: session.project.id, response },
    });
    throw error;
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
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeSession/parseJson" },
      extra: {
        sessionId,
        projectId: session.project.id,
        responseText: response.text.slice(0, 500),
      },
    });
    throw new Error("Failed to parse JSON");
  }

  // Check if the session is valid
  if (!parsedResponse.valid_video) {
    const error = new Error("Invalid session detected");
    console.error(`❌ [ANALYZE SESSION] Invalid session detected`);
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeSession/validation" },
      extra: {
        sessionId,
        projectId: session.project.id,
        notes: parsedResponse.notes,
      },
    });
    throw error;
  }

  // Valid session - validate the analysis data
  const data = parsedResponse.analysis;
  if (!data || !data.story || !data.name || !data.detected_issues) {
    const error = new Error("Invalid analysis data");
    console.error(`❌ [ANALYZE SESSION] Invalid analysis data:`, data);
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeSession/validation" },
      extra: {
        sessionId,
        projectId: session.project.id,
        analysisData: data,
      },
    });
    throw error;
  }

  // embed the session name and story
  let embedding;
  try {
    embedding = await embed(
      `${data.name}\n${data.features.join(", ")}\n${data.story}`,
    );
  } catch (error) {
    console.error(`❌ [ANALYZE SESSION] Failed to create embedding:`, error);
    Sentry.captureException(error, {
      tags: { job: "analyzeSession", step: "analyzeSession/embedding" },
      extra: {
        sessionId,
        projectId: session.project.id,
        name: data.name,
        story: data.story.slice(0, 200),
      },
    });
    throw error;
  }

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
    Sentry.captureException(analysisError, {
      tags: { job: "analyzeSession", step: "analyzeSession/updateAnalysis" },
      extra: {
        sessionId,
        projectId: session.project.id,
        analysisData: data,
      },
    });
    throw analysisError;
  }

  console.log(
    `✨ [ANALYZE SESSION] Successfully analyzed session ${sessionId}`,
  );

  return analyzedSession;
}
