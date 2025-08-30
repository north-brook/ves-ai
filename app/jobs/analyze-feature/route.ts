import { NextRequest, NextResponse } from "next/server";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import { generateObject } from "ai";
import { openai, OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import {
  ANALYZE_FEATURE_PROMPT,
  ANALYZE_FEATURE_SCHEMA,
  ANALYZE_FEATURE_SYSTEM,
} from "./prompts";
import { createHash } from "crypto";
import { writeDebugFile } from "../debug/helper";

export type AnalyzeFeatureJobRequest = {
  feature_id: string;
  force?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("🚫 Unauthorized analyze feature job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AnalyzeFeatureJobRequest = await request.json();
    const { feature_id, force } = body;

    if (!feature_id) {
      console.error("❌ [ANALYZE FEATURE] Missing feature_id");
      return NextResponse.json(
        { error: "Missing feature_id" },
        { status: 400 },
      );
    }

    console.log(
      `🧠 [ANALYZE FEATURE] Starting analysis for feature ${feature_id}`,
    );
    const supabase = adminSupabase();

    // Fetch feature details with all sessions that use it
    const { data: featureData, error: featureError } = await supabase
      .from("features")
      .select(
        `
        *,
        session_features(
          session:sessions(
            *,
            project_user:project_users(*),
            project_group:project_groups(*)
          )
        )
      `,
      )
      .eq("id", feature_id)
      .single();

    if (featureError || !featureData) {
      console.error(
        `❌ [ANALYZE FEATURE] Feature not found: ${feature_id}`,
        featureError,
      );
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    // Extract sessions from the join table structure
    const sessions =
      featureData.session_features
        ?.map((sf) => sf.session)
        .filter((s) => s !== null) || [];

    const { session_features: _, ...feature } = featureData;

    console.log(`📋 [ANALYZE FEATURE] Feature details:`);
    console.log(`   Name: ${feature.name}`);
    console.log(`   Description: ${feature.description || "N/A"}`);
    console.log(`   Sessions: ${sessions.length}`);

    if (!sessions.length) {
      console.error(
        `❌ [ANALYZE FEATURE] Feature ${feature_id} has no sessions`,
      );
      return NextResponse.json(
        {
          error: "Feature has no sessions",
        },
        { status: 400 },
      );
    }

    const analysisHash = createHash("sha256")
      .update(JSON.stringify(sessions.map((s) => s.id).sort()))
      .digest("hex");

    if (feature.analysis_hash === analysisHash && !force) {
      // no new analysis needed
      console.log(
        `🔄 [ANALYZE FEATURE] No new analysis needed for feature ${feature_id}`,
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Update feature status to analyzing
    console.log(
      `🔄 [ANALYZE FEATURE] Updating feature ${feature_id} to analyzing status`,
    );
    const { error: startUpdateError } = await supabase
      .from("features")
      .update({ status: "analyzing" })
      .eq("id", feature_id);

    if (startUpdateError) {
      console.error(
        `❌ [ANALYZE FEATURE] Failed to update feature status:`,
        startUpdateError,
      );
      throw new Error("Failed to update feature status");
    }

    // Prepare prompt for debugging
    const featurePrompt = ANALYZE_FEATURE_PROMPT({
      feature,
      sessions,
    });

    const { object } = await generateObject({
      model: openai.responses("gpt-5"),
      providerOptions: {
        openai: {
          reasoningEffort: "high",
          strictJsonSchema: true,
        } satisfies OpenAIResponsesProviderOptions,
      },
      system: ANALYZE_FEATURE_SYSTEM,
      schema: ANALYZE_FEATURE_SCHEMA,
      prompt: featurePrompt,
    });

    console.log(`🧠 [ANALYZE FEATURE] Analysis complete`);

    // Write debug file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await writeDebugFile(`debug-${timestamp}-analyze-feature-${feature_id}.txt`, {
      timestamp: new Date().toISOString(),
      job: "analyze-feature",
      id: feature_id,
      systemPrompt: ANALYZE_FEATURE_SYSTEM,
      userPrompt: featurePrompt,
      modelResponse: JSON.stringify(object, null, 2),
    });

    const { error: finishUpdateError } = await supabase
      .from("features")
      .update({
        status: "analyzed",
        analyzed_at: new Date().toISOString(),
        story: object.story,
        health: object.health,
        score: object.score,
        analysis_hash: analysisHash,
      })
      .eq("id", feature_id);

    if (finishUpdateError) {
      console.error(
        `❌ [ANALYZE FEATURE] Failed to update feature status:`,
        finishUpdateError,
      );
      throw new Error("Failed to update feature status");
    }

    console.log(
      `✅ [ANALYZE FEATURE] Successfully analyzed feature ${feature_id}`,
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`💥 [ANALYZE FEATURE] Job failed:`, error);

    // Try to update feature status to failed
    const body = await request.json().catch(() => ({}));
    try {
      if (body?.feature_id) {
        const supabase = adminSupabase();
        await supabase
          .from("features")
          .update({ status: "failed" })
          .eq("id", body.feature_id);
        console.log(
          `⚠️ [ANALYZE FEATURE] Updated feature ${body.feature_id} to failed status`,
        );
      }
    } catch (updateError) {
      console.error(
        `❌ [ANALYZE FEATURE] Failed to update feature to failed status:`,
        updateError,
      );
    }

    Sentry.captureException(error, {
      tags: { job: "analyzeFeature" },
      extra: { featureId: body?.feature_id },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
