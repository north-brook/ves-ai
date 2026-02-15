import { clearDebugFile, writeDebugFile } from "@/lib/debug/helper";
import embed from "@/lib/embed";
import adminSupabase from "@/lib/supabase/admin";
import { google } from "@ai-sdk/google";
import { ThinkingLevel } from "@google/genai";
import * as Sentry from "@sentry/nextjs";
import { generateObject } from "ai";
import {
  RECONCILE_ISSUE_PROMPT,
  RECONCILE_ISSUE_SCHEMA,
  RECONCILE_ISSUE_SYSTEM,
} from "./prompts";

export async function reconcileIssues(sessionId: string): Promise<string[]> {
  "use step";

  const supabase = adminSupabase();

  // get the session
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("project_id, detected_issues, story, active_duration, score")
    .eq("id", sessionId)
    .single();
  if (sessionError) {
    console.error(
      "❌ [RECONCILE ISSUES] Failed to fetch session:",
      sessionError,
    );
    throw new Error("Failed to fetch session");
  }

  if (!session.project_id) {
    console.error(
      "❌ [RECONCILE ISSUES] Session has no project ID:",
      sessionId,
    );
    throw new Error("Session has no project ID");
  }

  if (!session.detected_issues) {
    console.error(
      "❌ [RECONCILE ISSUES] Session has no detected issues:",
      sessionId,
    );
    throw new Error("Session has no detected issues");
  }

  if (!session.story) {
    console.error("❌ [RECONCILE ISSUES] Session has no story:", sessionId);
    throw new Error("Session has no story");
  }

  if (!session.active_duration) {
    console.error(
      "❌ [RECONCILE ISSUES] Session has no active duration:",
      sessionId,
    );
    throw new Error("Session has no active duration");
  }

  if (!session.score) {
    console.error("❌ [RECONCILE ISSUES] Session has no score:", sessionId);
    throw new Error("Session has no score");
  }

  // Track reconciled issue IDs (currently not used for triggering but may be in future)
  const reconciledIssueIds = new Set<string>();
  const issueIds: string[] = [];

  // Prepare for issue reconciliation debug
  let issueRunNumber = 0;
  const issueTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const issueDebugFile = `debug-${issueTimestamp}-reconcile-issues-${sessionId}.txt`;
  await clearDebugFile(issueDebugFile);

  // Reconcile issues (serial to avoid duplicates)
  for (const detectedIssue of session.detected_issues) {
    issueRunNumber++;
    try {
      // get 10 related issues (by embedding similarity)
      const detectedIssueEmbedding = await embed(
        `${detectedIssue.name}\n${detectedIssue.type}\n${detectedIssue.story}`,
      );

      const { data: relatedIssueData, error: relatedIssueError } =
        await supabase.rpc("match_issues", {
          query_embedding: detectedIssueEmbedding as unknown as string,
          match_threshold: 0.5,
          match_count: 10,
          project_id: session.project_id,
        });

      if (relatedIssueError) {
        console.error(
          `❌ [ANALYZE SESSION] Failed to get related issues:`,
          relatedIssueError,
        );
        Sentry.captureException(relatedIssueError, {
          tags: { job: "analyzeSession", step: "reconcileIssues" },
          extra: { sessionId: sessionId, issueName: detectedIssue.name },
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
        session,
        detectedIssue,
        relatedIssues,
      });

      // Generate reconciliation decision using Gemini
      const { object: issueResponse } = await generateObject({
        model: google("gemini-3-pro-preview"),
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.HIGH,
            },
          },
        },
        system: RECONCILE_ISSUE_SYSTEM,
        schema: RECONCILE_ISSUE_SCHEMA,
        prompt: issuePrompt,
      });

      // Process the response based on the decision
      if (issueResponse.decision === "merge") {
        if (!issueResponse.existingIssueName) {
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
                sessionId: sessionId,
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
                sessionId: sessionId,
                issueName: detectedIssue.name,
                existingIssueName: issueResponse.existingIssueName,
              },
            },
          );
        } else {
          // Track this issue ID for potential future analysis
          reconciledIssueIds.add(existingIssue.id);

          // Check if session-issue link already exists
          const { data: existingLink } = await supabase
            .from("session_issues")
            .select("*")
            .eq("session_id", sessionId)
            .eq("issue_id", existingIssue.id)
            .single();

          let sessionIssueError;
          if (existingLink) {
            // Update existing link with new times and story
            const { error } = await supabase
              .from("session_issues")
              .update({
                story: detectedIssue.story,
                times: detectedIssue.times,
              })
              .eq("session_id", sessionId)
              .eq("issue_id", existingIssue.id);
            sessionIssueError = error;
          } else {
            // Create new link
            const { error } = await supabase.from("session_issues").insert({
              project_id: session.project_id,
              session_id: sessionId,
              issue_id: existingIssue.id,
              story: detectedIssue.story,
              times: detectedIssue.times,
            });
            sessionIssueError = error;
          }

          if (sessionIssueError) {
            console.error(
              `❌ [ANALYZE SESSION] Failed to link session to issue:`,
              sessionIssueError,
            );
            Sentry.captureException(sessionIssueError, {
              tags: { job: "analyzeSession", step: "mergeIssue" },
              extra: {
                sessionId: sessionId,
                issueName: detectedIssue.name,
                existingIssueName: issueResponse.existingIssueName,
              },
            });
            continue;
          }
          // analyze the issue
          issueIds.push(existingIssue.id);
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
                sessionId: sessionId,
                issueName: detectedIssue.name,
                response: issueResponse,
              },
            },
          );
          continue;
        }

        // Create new issue
        const newIssueEmbedding = await embed(
          `${issueResponse.newIssue.name}\n${issueResponse.newIssue.type}\n${issueResponse.newIssue.story}`,
        );

        // Create the new issue
        const { data: createdIssue, error: createIssueError } = await supabase
          .from("issues")
          .insert({
            project_id: session.project_id,
            ...issueResponse.newIssue,
            embedding: newIssueEmbedding as unknown as string,
            status: "pending",
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
              sessionId: sessionId,
              issueName: detectedIssue.name,
              newIssue: issueResponse.newIssue,
            },
          });
        } else {
          // Track this issue ID for potential future analysis
          reconciledIssueIds.add(createdIssue.id);

          // Check if session-issue link already exists (shouldn't happen for new issues, but be safe)
          const { data: existingLink } = await supabase
            .from("session_issues")
            .select("*")
            .eq("session_id", sessionId)
            .eq("issue_id", createdIssue.id)
            .single();

          let sessionIssueError;
          if (existingLink) {
            // Update existing link with new times and story
            const { error } = await supabase
              .from("session_issues")
              .update({
                story: detectedIssue.story,
                times: detectedIssue.times,
              })
              .eq("session_id", sessionId)
              .eq("issue_id", createdIssue.id);
            sessionIssueError = error;
          } else {
            // Create new link
            const { error } = await supabase.from("session_issues").insert({
              project_id: session.project_id,
              session_id: sessionId,
              issue_id: createdIssue.id,
              story: detectedIssue.story,
              times: detectedIssue.times,
            });
            sessionIssueError = error;
          }

          if (sessionIssueError) {
            console.error(
              `❌ [ANALYZE SESSION] Failed to link session to issue:`,
              sessionIssueError,
            );
            Sentry.captureException(sessionIssueError, {
              tags: { job: "analyzeSession", step: "createIssue" },
              extra: {
                sessionId: sessionId,
                issueName: detectedIssue.name,
                newIssue: issueResponse.newIssue,
              },
            });
            continue;
          }
          issueIds.push(createdIssue.id);
        }
      }

      // Write debug file for issue reconciliation
      await writeDebugFile(
        issueDebugFile,
        {
          timestamp: new Date().toISOString(),
          job: "reconcile-issue",
          id: sessionId,
          systemPrompt: RECONCILE_ISSUE_SYSTEM,
          userPrompt: issuePrompt,
          modelResponse: JSON.stringify(issueResponse, null, 2),
          runNumber: issueRunNumber,
          itemName: detectedIssue.name,
        },
        true, // append mode
      );
      console.log(
        `✅ [RECONCILE ISSUE] Reconciled issue ${detectedIssue.name} with ID ${issueIds[issueIds.length - 1]}`,
      );
    } catch (error) {
      console.error(`❌ [RECONCILE ISSUES] Failed to reconcile issue:`, error);
      Sentry.captureException(error, {
        tags: { job: "analyzeSession" },
        extra: { sessionId: sessionId, issueName: detectedIssue.name },
      });
    }
  }

  console.log(
    `✅ [RECONCILE ISSUES] Reconciled ${issueIds.length} issues for session ${sessionId}`,
  );

  return issueIds;
}
