import { NextRequest, NextResponse } from "next/server";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import {
  createPartFromUri,
  createUserContent,
  GoogleGenAI,
} from "@google/genai";
import nextJobs from "../sync-sessions/next-job";
import { SessionDetectedFeature, SessionDetectedIssue } from "@/types";
import { embed, generateObject } from "ai";
import { openai, OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import {
  ANALYZE_SESSION_SYSTEM,
  ANALYZE_SESSION_SCHEMA,
  RECONCILE_FEATURE_SYSTEM,
  RECONCILE_FEATURE_PROMPT,
  RECONCILE_FEATURE_SCHEMA,
  RECONCILE_ISSUE_SYSTEM,
  RECONCILE_ISSUE_PROMPT,
  RECONCILE_ISSUE_SCHEMA,
} from "@/app/jobs/analyze-session/prompts";
import constructContext from "./context";
import { AnalyzeFeatureJobRequest } from "../analyze-feature/route";
import { AnalyzeUserJobRequest } from "../analyze-user/route";
import { writeDebugFile, clearDebugFile } from "../debug/helper";

export type AnalyzeSessionJobRequest = {
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

    const body: AnalyzeSessionJobRequest = await request.json();
    const { session_id } = body;

    if (!session_id) {
      console.error("❌ [ANALYZE SESSION] Missing session_id");
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 },
      );
    }

    console.log(
      `🧠 [ANALYZE SESSION] Starting analysis for session ${session_id}`,
    );
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
        `❌ [ANALYZE SESSION] Session not found: ${session_id}`,
        sessionError,
      );
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
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
        `⚠️ [ANALYZE SESSION] Session ${session_id} is not processed (status: ${session.status})`,
      );
      return NextResponse.json(
        {
          error: `Session is not processed (status: ${session.status})`,
        },
        { status: 400 },
      );
    }

    if (!session.video_uri) {
      console.error(
        `❌ [ANALYZE SESSION] Session ${session_id} has no video URL`,
      );
      return NextResponse.json(
        {
          error: "Session has no video URL",
        },
        { status: 400 },
      );
    }

    if (!session.event_uri) {
      console.error(
        `❌ [ANALYZE SESSION] Session ${session_id} has no events URL`,
      );
      return NextResponse.json(
        {
          error: "Session has no events URL",
        },
        { status: 400 },
      );
    }

    // Update session status to analyzing
    console.log(
      `🔄 [ANALYZE SESSION] Updating session ${session_id} to analyzing status`,
    );
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ status: "analyzing", analyzed_at: new Date().toISOString() })
      .eq("id", session_id);

    if (updateError) {
      console.error(
        `❌ [ANALYZE SESSION] Failed to update session status:`,
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

      console.log(`🤖 [ANALYZE SESSION] AI video analysis`);
      console.log(`   Video to analyze: ${session.video_uri}`);
      console.log(`   Events to analyze: ${session.event_uri}`);

      const context = await constructContext({
        eventUri: session.event_uri,
        sessionId: session.id,
      });

      // Prepare the user prompt for debugging
      const userPromptContent = `Video: ${session.video_uri}\n\nContext:\n${context}`;

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
      await writeDebugFile(
        `debug-${timestamp}-analyze-session-${session_id}.txt`,
        {
          timestamp: new Date().toISOString(),
          job: "analyze-session",
          id: session_id,
          systemPrompt: ANALYZE_SESSION_SYSTEM,
          userPrompt: userPromptContent,
          modelResponse: response?.text || "No response",
        },
      );

      if (!response?.text) {
        console.error(`❌ [ANALYZE SESSION] Failed to get response from AI`);
        return NextResponse.json(
          { error: "Failed to get response from AI" },
          { status: 500 },
        );
      }

      let parsedResponse: {
        valid_video: boolean;
        notes: string | null;
        analysis: {
          story: string;
          detected_features: SessionDetectedFeature[];
          detected_issues: SessionDetectedIssue[];
          name: string;
          health: string;
          score: number;
        } | null;
      };

      try {
        parsedResponse = JSON.parse(response.text);
      } catch (error) {
        console.error(`❌ [ANALYZE SESSION] Failed to parse JSON:`, error);
        return NextResponse.json(
          { error: "Failed to parse JSON" },
          { status: 500 },
        );
      }

      // Check if the session is valid
      if (!parsedResponse.valid_video) {
        console.error(`❌ [ANALYZE SESSION] Invalid session detected`);
        throw new Error("Invalid session detected");
      }

      // Valid session - validate the analysis data
      const data = parsedResponse.analysis;
      if (!data || !data.story || !data.detected_features || !data.name) {
        console.error(`❌ [ANALYZE SESSION] Invalid analysis data:`, data);
        return NextResponse.json(
          { error: "Invalid analysis data" },
          { status: 500 },
        );
      }

      // Extract feature names for embedding and backward compatibility
      const featureNames = data.detected_features.map((f) => f.name);

      // embed the session name, features, and story
      const { embedding } = await embed({
        model: openai.textEmbeddingModel("text-embedding-3-small"),
        value: `${data.name}\n${featureNames.join(", ")}\n${data.story}`,
      });

      const { data: analyzedSession, error: analysisError } = await supabase
        .from("sessions")
        .update({
          name: data.name,
          status: "analyzed",
          story: data.story,
          detected_features: data.detected_features,
          detected_issues: data.detected_issues,
          health: data.health,
          score: data.score,
          embedding: embedding as unknown as string,
        })
        .eq("id", session_id)
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
        `✨ [ANALYZE SESSION] Successfully analyzed session ${session_id}`,
      );

      // Track reconciled feature IDs for triggering analyze-feature
      const reconciledFeatureIds = new Set<string>();

      // Prepare for feature reconciliation debug
      let featureRunNumber = 0;
      const featureTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const featureDebugFile = `debug-${featureTimestamp}-reconcile-features-${session_id}.txt`;
      await clearDebugFile(featureDebugFile);

      // Reconcile features (serial to avoid duplicates)
      for (const detectedFeature of data.detected_features) {
        featureRunNumber++;
        try {
          // get 10 related features (by embedding similarity)
          const { embedding: detectedFeatureEmbedding } = await embed({
            model: openai.textEmbeddingModel("text-embedding-3-small"),
            value: `${detectedFeature.name}\n${detectedFeature.description}`,
          });

          const { data: relatedFeatureData, error: relatedFeatureError } =
            await supabase.rpc("match_features", {
              query_embedding: detectedFeatureEmbedding as unknown as string,
              match_threshold: 0.5,
              match_count: 10,
            });

          if (relatedFeatureError) {
            console.error(
              `❌ [ANALYZE SESSION] Failed to get related features:`,
              relatedFeatureError,
            );
            Sentry.captureException(relatedFeatureError, {
              tags: { job: "analyzeSession", step: "reconcileFeatures" },
              extra: {
                sessionId: session_id,
                featureName: detectedFeature.name,
              },
            });
          }

          const relatedFeatureIds = relatedFeatureData?.map((f) => f.id) || [];

          const relatedFeatures = (
            await Promise.all(
              relatedFeatureIds.map(async (id) => {
                const { data: featureData } = await supabase
                  .from("features")
                  .select("*")
                  .eq("id", id)
                  .single();
                return featureData;
              }),
            )
          ).filter((f) => f !== null);

          // Prepare prompt for debugging
          const featurePrompt = RECONCILE_FEATURE_PROMPT({
            session: analyzedSession,
            detectedFeature,
            relatedFeatures,
          });

          // Generate reconciliation decision using generateObject
          const { object: featureResponse } = await generateObject({
            model: openai.responses("gpt-5"),
            providerOptions: {
              openai: {
                reasoningEffort: "high",
                strictJsonSchema: true,
              } satisfies OpenAIResponsesProviderOptions,
            },
            system: RECONCILE_FEATURE_SYSTEM,
            prompt: featurePrompt,
            schema: RECONCILE_FEATURE_SCHEMA,
          });

          // Process the response based on the decision
          if (featureResponse.decision === "merge") {
            if (
              !featureResponse.existingFeatureName ||
              !featureResponse.featureUpdate
            ) {
              console.error(
                `❌ [ANALYZE SESSION] Invalid merge response - missing required fields`,
              );
              Sentry.captureException(
                new Error(
                  "Invalid merge response - missing existingFeatureName or featureUpdate",
                ),
                {
                  tags: { job: "analyzeSession", step: "mergeFeature" },
                  extra: {
                    sessionId: session_id,
                    featureName: detectedFeature.name,
                    response: featureResponse,
                  },
                },
              );
              continue;
            }

            // Find the existing feature
            const existingFeature = relatedFeatures.find(
              (f) => f.name === featureResponse.existingFeatureName,
            );

            if (!existingFeature) {
              console.error(
                `❌ [ANALYZE SESSION] Existing feature not found:`,
                featureResponse.existingFeatureName,
              );
              Sentry.captureException(
                new Error(
                  `Existing feature not found: ${featureResponse.existingFeatureName}`,
                ),
                {
                  tags: {
                    job: "analyzeSession",
                    step: "mergeFeature",
                  },
                  extra: {
                    sessionId: session_id,
                    featureName: detectedFeature.name,
                    existingFeatureName: featureResponse.existingFeatureName,
                    featureUpdate: featureResponse.featureUpdate,
                  },
                },
              );
            } else {
              // Track this feature ID for later analysis
              reconciledFeatureIds.add(existingFeature.id);

              // Link the session to the feature
              const { error: sessionFeatureError } = await supabase
                .from("session_features")
                .insert({
                  project_id: analyzedSession.project_id,
                  session_id: analyzedSession.id,
                  feature_id: existingFeature.id,
                });

              if (sessionFeatureError) {
                console.error(
                  `❌ [ANALYZE SESSION] Failed to link session to feature:`,
                  sessionFeatureError,
                );
                Sentry.captureException(sessionFeatureError, {
                  tags: { job: "analyzeSession", step: "mergeFeature" },
                  extra: {
                    sessionId: session_id,
                    featureName: detectedFeature.name,
                    existingFeatureName: featureResponse.existingFeatureName,
                    featureUpdate: featureResponse.featureUpdate,
                  },
                });
              } else {
                // Embed the updated feature
                const { embedding: updatedFeatureEmbedding } = await embed({
                  model: openai.textEmbeddingModel("text-embedding-3-small"),
                  value: `${featureResponse.featureUpdate.name}\n${featureResponse.featureUpdate.description}`,
                });

                // Update the feature with the new information
                const { error: updatedFeatureError } = await supabase
                  .from("features")
                  .update({
                    ...featureResponse.featureUpdate,
                    embedding: updatedFeatureEmbedding as unknown as string,
                  })
                  .eq("id", existingFeature.id);

                if (updatedFeatureError) {
                  console.error(
                    `❌ [ANALYZE SESSION] Failed to update feature after merge:`,
                    updatedFeatureError,
                  );
                  Sentry.captureException(updatedFeatureError, {
                    tags: { job: "analyzeSession", step: "mergeFeature" },
                    extra: {
                      sessionId: session_id,
                      featureName: detectedFeature.name,
                      existingFeatureName: featureResponse.existingFeatureName,
                      featureUpdate: featureResponse.featureUpdate,
                    },
                  });
                }
              }
            }
          } else {
            if (!featureResponse.newFeature) {
              console.error(
                `❌ [ANALYZE SESSION] Invalid create response - missing newFeature`,
              );
              Sentry.captureException(
                new Error("Invalid create response - missing newFeature"),
                {
                  tags: { job: "analyzeSession", step: "createFeature" },
                  extra: {
                    sessionId: session_id,
                    featureName: detectedFeature.name,
                    response: featureResponse,
                  },
                },
              );
              continue;
            }

            // Create new feature
            const { embedding: newFeatureEmbedding } = await embed({
              model: openai.textEmbeddingModel("text-embedding-3-small"),
              value: `${featureResponse.newFeature.name}\n${featureResponse.newFeature.description}`,
            });

            // Create the new feature
            const { data: createdFeature, error: createFeatureError } =
              await supabase
                .from("features")
                .insert({
                  project_id: analyzedSession.project_id,
                  ...featureResponse.newFeature,
                  embedding: newFeatureEmbedding as unknown as string,
                  status: "pending",
                })
                .select()
                .single();

            if (createFeatureError || !createdFeature) {
              console.error(
                `❌ [ANALYZE SESSION] Failed to create feature:`,
                createFeatureError,
              );
              Sentry.captureException(createFeatureError, {
                tags: { job: "analyzeSession", step: "createFeature" },
                extra: {
                  sessionId: session_id,
                  featureName: detectedFeature.name,
                  newFeature: featureResponse.newFeature,
                },
              });
            } else {
              // Track this feature ID for later analysis
              reconciledFeatureIds.add(createdFeature.id);

              // Link the session to the feature
              const { error: sessionFeatureError } = await supabase
                .from("session_features")
                .insert({
                  project_id: analyzedSession.project_id,
                  session_id: analyzedSession.id,
                  feature_id: createdFeature.id,
                });

              if (sessionFeatureError) {
                console.error(
                  `❌ [ANALYZE SESSION] Failed to link session to feature:`,
                  sessionFeatureError,
                );
                Sentry.captureException(sessionFeatureError, {
                  tags: { job: "analyzeSession", step: "createFeature" },
                  extra: {
                    sessionId: session_id,
                    featureName: detectedFeature.name,
                    newFeature: featureResponse.newFeature,
                  },
                });
              }
            }
          }

          // Write debug file for feature reconciliation
          await writeDebugFile(
            featureDebugFile,
            {
              timestamp: new Date().toISOString(),
              job: "reconcile-feature",
              id: session_id,
              systemPrompt: RECONCILE_FEATURE_SYSTEM,
              userPrompt: featurePrompt,
              modelResponse: JSON.stringify(featureResponse, null, 2),
              runNumber: featureRunNumber,
              itemName: detectedFeature.name,
            },
            true, // append mode
          );
        } catch (error) {
          console.error(
            `❌ [ANALYZE SESSION] Failed to reconcile feature:`,
            error,
          );
          Sentry.captureException(error, {
            tags: { job: "analyzeSession" },
            extra: {
              sessionId: session_id,
              featureName: detectedFeature.name,
            },
          });
        }
      }

      // Track reconciled issue IDs (currently not used for triggering but may be in future)
      const reconciledIssueIds = new Set<string>();

      // Prepare for issue reconciliation debug
      let issueRunNumber = 0;
      const issueTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const issueDebugFile = `debug-${issueTimestamp}-reconcile-issues-${session_id}.txt`;
      await clearDebugFile(issueDebugFile);

      // Reconcile issues (serial to avoid duplicates)
      for (const detectedIssue of data.detected_issues) {
        issueRunNumber++;
        try {
          // get 10 related issues (by embedding similarity)
          const { embedding: detectedIssueEmbedding } = await embed({
            model: openai.textEmbeddingModel("text-embedding-3-small"),
            value: `${detectedIssue.name}\n${detectedIssue.type}\n${detectedIssue.severity}\n${detectedIssue.description}`,
          });

          const { data: relatedIssueData, error: relatedIssueError } =
            await supabase.rpc("match_issues", {
              query_embedding: detectedIssueEmbedding as unknown as string,
              match_threshold: 0.5,
              match_count: 10,
            });

          if (relatedIssueError) {
            console.error(
              `❌ [ANALYZE SESSION] Failed to get related issues:`,
              relatedIssueError,
            );
            Sentry.captureException(relatedIssueError, {
              tags: { job: "analyzeSession", step: "reconcileIssues" },
              extra: { sessionId: session_id, issueName: detectedIssue.name },
            });
          }

          const relatedIssueIds = relatedIssueData?.map((i) => i.id) || [];

          const relatedIssues = (
            await Promise.all(
              relatedIssueIds.map(async (id) => {
                const { data: issueData } = await supabase
                  .from("issues")
                  .select("*")
                  .eq("id", id)
                  .single();
                return issueData;
              }),
            )
          ).filter((i) => i !== null);

          // Prepare prompt for debugging
          const issuePrompt = RECONCILE_ISSUE_PROMPT({
            session: analyzedSession,
            detectedIssue,
            relatedIssues,
          });

          // Generate reconciliation decision using generateObject
          const { object: issueResponse } = await generateObject({
            model: openai.responses("gpt-5"),
            providerOptions: {
              openai: {
                reasoningEffort: "high",
                strictJsonSchema: true,
              } satisfies OpenAIResponsesProviderOptions,
            },
            system: RECONCILE_ISSUE_SYSTEM,
            prompt: issuePrompt,
            schema: RECONCILE_ISSUE_SCHEMA,
          });

          // Process the response based on the decision
          if (issueResponse.decision === "merge") {
            if (
              !issueResponse.existingIssueName ||
              !issueResponse.issueUpdate
            ) {
              console.error(
                `❌ [ANALYZE SESSION] Invalid merge response - missing required fields`,
              );
              Sentry.captureException(
                new Error(
                  "Invalid merge response - missing existingIssueName or issueUpdate",
                ),
                {
                  tags: { job: "analyzeSession", step: "mergeIssue" },
                  extra: {
                    sessionId: session_id,
                    issueName: detectedIssue.name,
                    response: issueResponse,
                  },
                },
              );
              continue;
            }

            // Find the existing issue
            const existingIssue = relatedIssues.find(
              (i) => i.name === issueResponse.existingIssueName,
            );

            if (!existingIssue) {
              console.error(
                `❌ [ANALYZE SESSION] Existing issue not found:`,
                issueResponse.existingIssueName,
              );
              Sentry.captureException(
                new Error(
                  `Existing issue not found: ${issueResponse.existingIssueName}`,
                ),
                {
                  tags: {
                    job: "analyzeSession",
                    step: "mergeIssue",
                  },
                  extra: {
                    sessionId: session_id,
                    issueName: detectedIssue.name,
                    existingIssueName: issueResponse.existingIssueName,
                    issueUpdate: issueResponse.issueUpdate,
                  },
                },
              );
            } else {
              // Track this issue ID for potential future analysis
              reconciledIssueIds.add(existingIssue.id);

              // Link the session to the issue
              const { error: sessionIssueError } = await supabase
                .from("session_issues")
                .insert({
                  project_id: analyzedSession.project_id,
                  session_id: analyzedSession.id,
                  issue_id: existingIssue.id,
                });

              if (sessionIssueError) {
                console.error(
                  `❌ [ANALYZE SESSION] Failed to link session to issue:`,
                  sessionIssueError,
                );
                Sentry.captureException(sessionIssueError, {
                  tags: { job: "analyzeSession", step: "mergeIssue" },
                  extra: {
                    sessionId: session_id,
                    issueName: detectedIssue.name,
                    existingIssueName: issueResponse.existingIssueName,
                    issueUpdate: issueResponse.issueUpdate,
                  },
                });
              } else {
                // Embed the updated issue
                const { embedding: updatedIssueEmbedding } = await embed({
                  model: openai.textEmbeddingModel("text-embedding-3-small"),
                  value: `${issueResponse.issueUpdate.name}\n${issueResponse.issueUpdate.type}\n${issueResponse.issueUpdate.description}`,
                });

                // Update the issue with the new information
                const { error: updatedIssueError } = await supabase
                  .from("issues")
                  .update({
                    ...issueResponse.issueUpdate,
                    embedding: updatedIssueEmbedding as unknown as string,
                  })
                  .eq("id", existingIssue.id);

                if (updatedIssueError) {
                  console.error(
                    `❌ [ANALYZE SESSION] Failed to update issue after merge:`,
                    updatedIssueError,
                  );
                  Sentry.captureException(updatedIssueError, {
                    tags: { job: "analyzeSession", step: "mergeIssue" },
                    extra: {
                      sessionId: session_id,
                      issueName: detectedIssue.name,
                      existingIssueName: issueResponse.existingIssueName,
                      issueUpdate: issueResponse.issueUpdate,
                    },
                  });
                }
              }
            }
          } else {
            if (!issueResponse.newIssue) {
              console.error(
                `❌ [ANALYZE SESSION] Invalid create response - missing newIssue`,
              );
              Sentry.captureException(
                new Error("Invalid create response - missing newIssue"),
                {
                  tags: { job: "analyzeSession", step: "createIssue" },
                  extra: {
                    sessionId: session_id,
                    issueName: detectedIssue.name,
                    response: issueResponse,
                  },
                },
              );
              continue;
            }

            // Create new issue
            const { embedding: newIssueEmbedding } = await embed({
              model: openai.textEmbeddingModel("text-embedding-3-small"),
              value: `${issueResponse.newIssue.name}\n${issueResponse.newIssue.type}\n${issueResponse.newIssue.description}`,
            });

            // Create the new issue
            const { data: createdIssue, error: createIssueError } =
              await supabase
                .from("issues")
                .insert({
                  project_id: analyzedSession.project_id,
                  ...issueResponse.newIssue,
                  embedding: newIssueEmbedding as unknown as string,
                })
                .select()
                .single();

            if (createIssueError || !createdIssue) {
              console.error(
                `❌ [ANALYZE SESSION] Failed to create issue:`,
                createIssueError,
              );
              Sentry.captureException(createIssueError, {
                tags: { job: "analyzeSession", step: "createIssue" },
                extra: {
                  sessionId: session_id,
                  issueName: detectedIssue.name,
                  newIssue: issueResponse.newIssue,
                },
              });
            } else {
              // Track this issue ID for potential future analysis
              reconciledIssueIds.add(createdIssue.id);

              // Link the session to the issue
              const { error: sessionIssueError } = await supabase
                .from("session_issues")
                .insert({
                  project_id: analyzedSession.project_id,
                  session_id: analyzedSession.id,
                  issue_id: createdIssue.id,
                });

              if (sessionIssueError) {
                console.error(
                  `❌ [ANALYZE SESSION] Failed to link session to issue:`,
                  sessionIssueError,
                );
                Sentry.captureException(sessionIssueError, {
                  tags: { job: "analyzeSession", step: "createIssue" },
                  extra: {
                    sessionId: session_id,
                    issueName: detectedIssue.name,
                    newIssue: issueResponse.newIssue,
                  },
                });
              }
            }
          }

          // Write debug file for issue reconciliation
          await writeDebugFile(
            issueDebugFile,
            {
              timestamp: new Date().toISOString(),
              job: "reconcile-issue",
              id: session_id,
              systemPrompt: RECONCILE_ISSUE_SYSTEM,
              userPrompt: issuePrompt,
              modelResponse: JSON.stringify(issueResponse, null, 2),
              runNumber: issueRunNumber,
              itemName: detectedIssue.name,
            },
            true, // append mode
          );
        } catch (error) {
          console.error(
            `❌ [ANALYZE SESSION] Failed to reconcile issue:`,
            error,
          );
          Sentry.captureException(error, {
            tags: { job: "analyzeSession" },
            extra: { sessionId: session_id, issueName: detectedIssue.name },
          });
        }
      }

      // Trigger analyze-feature for all reconciled features (fire and forget)
      if (reconciledFeatureIds.size > 0) {
        console.log(
          `🔄 [ANALYZE SESSION] Triggering analyze-feature for ${reconciledFeatureIds.size} features`,
        );
        for (const featureId of reconciledFeatureIds) {
          try {
            fetch(`${process.env.NEXT_PUBLIC_URL}/jobs/analyze-feature`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.CRON_SECRET}`,
              },
              body: JSON.stringify({
                feature_id: featureId,
              } as AnalyzeFeatureJobRequest),
            }).catch((error) => {
              console.error(
                `❌ [ANALYZE SESSION] Failed to trigger analyze-feature for ${featureId}:`,
                error,
              );
            });
          } catch (error) {
            console.error(
              `❌ [ANALYZE SESSION] Failed to trigger analyze-feature for ${featureId}:`,
              error,
            );
          }
        }
      }

      // Trigger analyze-user for the session's user (fire and forget)
      if (analyzedSession.project_user_id) {
        console.log(
          `🔄 [ANALYZE SESSION] Triggering analyze-user for user ${analyzedSession.project_user_id}`,
        );
        try {
          fetch(`${process.env.NEXT_PUBLIC_URL}/jobs/analyze-user`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.CRON_SECRET}`,
            },
            body: JSON.stringify({
              project_user_id: analyzedSession.project_user_id,
            } as AnalyzeUserJobRequest),
          }).catch((error) => {
            console.error(
              `❌ [ANALYZE SESSION] Failed to trigger analyze-user:`,
              error,
            );
          });
        } catch (error) {
          console.error(
            `❌ [ANALYZE SESSION] Failed to trigger analyze-user:`,
            error,
          );
        }
      }

      // Trigger processing for next pending session in the project
      console.log(
        `🔍 [ANALYZE SESSION] Checking for next pending session to process`,
      );

      await nextJobs(session.project.id, 1);

      return NextResponse.json({
        success: true,
        session_id,
        message: "Analysis completed",
        ...data,
      });
    } catch (analysisError) {
      console.error(`❌ [ANALYZE SESSION] Analysis failed:`, analysisError);

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
    console.error(`💥 [ANALYZE SESSION] Job failed:`, error);

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
          `⚠️ [ANALYZE SESSION] Updated session ${body.session_id} to failed status`,
        );
      }
    } catch (updateError) {
      console.error(
        `❌ [ANALYZE SESSION] Failed to update session to failed status:`,
        updateError,
      );
    }

    Sentry.captureException(error, {
      tags: { job: "analyzeSession" },
      extra: {
        sessionId: (await request.json().catch(() => ({}))).session_id,
      },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
