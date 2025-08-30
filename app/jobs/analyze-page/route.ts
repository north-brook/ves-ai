import { NextRequest, NextResponse } from "next/server";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import { generateObject } from "ai";
import { openai, OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import {
  ANALYZE_PAGE_PROMPT,
  ANALYZE_PAGE_SCHEMA,
  ANALYZE_PAGE_SYSTEM,
} from "./prompts";
import { createHash } from "crypto";
import { writeDebugFile } from "../debug/helper";

export type AnalyzePageJobRequest = {
  page_id: string;
  force?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("🚫 Unauthorized analyze page job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AnalyzePageJobRequest = await request.json();
    const { page_id, force } = body;

    if (!page_id) {
      console.error("❌ [ANALYZE PAGE] Missing page_id");
      return NextResponse.json({ error: "Missing page_id" }, { status: 400 });
    }

    console.log(`🧠 [ANALYZE PAGE] Starting analysis for page ${page_id}`);
    const supabase = adminSupabase();

    // Fetch page details with all sessions that use it
    const { data: pageData, error: pageError } = await supabase
      .from("pages")
      .select(
        `
        *,
        session_pages(
          session:sessions(
            *,
            project_user:project_users(*),
            project_group:project_groups(*)
          )
        )
      `,
      )
      .eq("id", page_id)
      .single();

    if (pageError || !pageData) {
      console.error(`❌ [ANALYZE PAGE] Page not found: ${page_id}`, pageError);
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Extract sessions from the join table structure
    const sessions =
      pageData.session_pages
        ?.map((sf) => sf.session)
        .filter((s) => s !== null) || [];

    const { session_pages: _, ...page } = pageData;

    console.log(`📋 [ANALYZE PAGE] Page details:`);
    console.log(`   Path: ${page.path}`);
    console.log(`   Sessions: ${sessions.length}`);

    if (!sessions.length) {
      console.error(`❌ [ANALYZE PAGE] Page ${page_id} has no sessions`);
      return NextResponse.json(
        {
          error: "Page has no sessions",
        },
        { status: 400 },
      );
    }

    const analysisHash = createHash("sha256")
      .update(JSON.stringify(sessions.map((s) => s.id).sort()))
      .digest("hex");

    if (page.analysis_hash === analysisHash && !force) {
      // no new analysis needed
      console.log(
        `🔄 [ANALYZE PAGE] No new analysis needed for page ${page_id}`,
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Update page status to analyzing
    console.log(
      `🔄 [ANALYZE PAGE] Updating page ${page_id} to analyzing status`,
    );
    const { error: startUpdateError } = await supabase
      .from("pages")
      .update({ status: "analyzing" })
      .eq("id", page_id);

    if (startUpdateError) {
      console.error(
        `❌ [ANALYZE PAGE] Failed to update page status:`,
        startUpdateError,
      );
      throw new Error("Failed to update page status");
    }

    // Prepare prompt for debugging
    const pagePrompt = ANALYZE_PAGE_PROMPT({
      page,
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
      system: ANALYZE_PAGE_SYSTEM,
      schema: ANALYZE_PAGE_SCHEMA,
      prompt: pagePrompt,
    });

    console.log(`🧠 [ANALYZE PAGE] Analysis complete`);

    // Write debug file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await writeDebugFile(`debug-${timestamp}-analyze-page-${page_id}.txt`, {
      timestamp: new Date().toISOString(),
      job: "analyze-page",
      id: page_id,
      systemPrompt: ANALYZE_PAGE_SYSTEM,
      userPrompt: pagePrompt,
      modelResponse: JSON.stringify(object, null, 2),
    });

    const { error: finishUpdateError } = await supabase
      .from("pages")
      .update({
        status: "analyzed",
        analyzed_at: new Date().toISOString(),
        story: object.story,
        health: object.health,
        score: object.score,
        analysis_hash: analysisHash,
      })
      .eq("id", page_id);

    if (finishUpdateError) {
      console.error(
        `❌ [ANALYZE PAGE] Failed to update page status:`,
        finishUpdateError,
      );
      throw new Error("Failed to update page status");
    }

    console.log(`✅ [ANALYZE PAGE] Successfully analyzed page ${page_id}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`💥 [ANALYZE PAGE] Job failed:`, error);

    // Try to update page status to failed
    const body = await request.json().catch(() => ({}));
    try {
      if (body?.page_id) {
        const supabase = adminSupabase();
        await supabase
          .from("pages")
          .update({ status: "failed" })
          .eq("id", body.page_id);
        console.log(
          `⚠️ [ANALYZE PAGE] Updated page ${body.page_id} to failed status`,
        );
      }
    } catch (updateError) {
      console.error(
        `❌ [ANALYZE PAGE] Failed to update page to failed status:`,
        updateError,
      );
    }

    Sentry.captureException(error, {
      tags: { job: "analyzePage" },
      extra: { pageId: body?.page_id },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
