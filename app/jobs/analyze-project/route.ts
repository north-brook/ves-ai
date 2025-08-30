import { NextRequest, NextResponse } from "next/server";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import { generateObject } from "ai";
import { openai, OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import {
  ANALYZE_PROJECT_PROMPT,
  ANALYZE_PROJECT_SCHEMA,
  ANALYZE_PROJECT_SYSTEM,
} from "./prompts";
import { writeDebugFile } from "../debug/helper";

export type AnalyzeProjectJobRequest = {
  project_id: string;
};

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("🚫 Unauthorized analyze project job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AnalyzeProjectJobRequest = await request.json();
    const { project_id } = body;

    if (!project_id) {
      console.error("❌ [ANALYZE PROJECT] Missing project_id");
      return NextResponse.json(
        { error: "Missing project_id" },
        { status: 400 },
      );
    }

    console.log(
      `📊 [ANALYZE PROJECT] Starting weekly analysis for project ${project_id}`,
    );
    const supabase = adminSupabase();

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      console.error(
        `❌ [ANALYZE PROJECT] Project not found: ${project_id}`,
        projectError,
      );
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Calculate date range for the past week
    const weekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const now = new Date().toISOString();

    // Fetch recent sessions (last 7 days) with related data
    const { data: recentSessions, error: sessionsError } = await supabase
      .from("sessions")
      .select(
        `
        *,
        project_user:project_users(*),
        project_group:project_groups(*),
        session_features(feature:features(*)),
        session_issues(issue:issues(*))
      `,
      )
      .eq("project_id", project_id)
      .gte("created_at", weekAgo)
      .lte("created_at", now)
      .order("created_at", { ascending: false });

    if (sessionsError) {
      console.error(
        `❌ [ANALYZE PROJECT] Failed to fetch sessions:`,
        sessionsError,
      );
      throw new Error("Failed to fetch sessions");
    }

    // Fetch recent active users (users with sessions in last 7 days)
    const { data: recentUsers, error: usersError } = await supabase
      .from("project_users")
      .select("*")
      .eq("project_id", project_id)
      .gte("analyzed_at", weekAgo)
      .order("score", { ascending: false, nullsFirst: false });

    if (usersError) {
      console.error(`❌ [ANALYZE PROJECT] Failed to fetch users:`, usersError);
      throw new Error("Failed to fetch users");
    }

    // Fetch recent active groups
    const { data: recentGroups, error: groupsError } = await supabase
      .from("project_groups")
      .select("*")
      .eq("project_id", project_id)
      .gte("analyzed_at", weekAgo)
      .order("score", { ascending: false, nullsFirst: false });

    if (groupsError) {
      console.error(
        `❌ [ANALYZE PROJECT] Failed to fetch groups:`,
        groupsError,
      );
      throw new Error("Failed to fetch groups");
    }

    // Fetch all features for the project
    const { data: features, error: featuresError } = await supabase
      .from("features")
      .select("*")
      .eq("project_id", project_id)
      .order("score", { ascending: false, nullsFirst: false });

    if (featuresError) {
      console.error(
        `❌ [ANALYZE PROJECT] Failed to fetch features:`,
        featuresError,
      );
      throw new Error("Failed to fetch features");
    }

    // Calculate weekly statistics
    const { data: weeklySessions } = await supabase
      .from("sessions")
      .select("score")
      .eq("project_id", project_id)
      .gte("created_at", weekAgo)
      .lte("created_at", now)
      .not("score", "is", null);

    const { data: weeklyUsers } = await supabase
      .from("project_users")
      .select("score")
      .eq("project_id", project_id)
      .gte("analyzed_at", weekAgo)
      .not("score", "is", null);

    const { data: weeklyGroups } = await supabase
      .from("project_groups")
      .select("score")
      .eq("project_id", project_id)
      .gte("analyzed_at", weekAgo);

    // Fetch all new issues from this week
    const { data: weeklyNewIssues } = await supabase
      .from("issues")
      .select("*")
      .eq("project_id", project_id)
      .gte("created_at", weekAgo)
      .order("priority", { ascending: true })
      .order("severity", { ascending: true });

    // Fetch all critical/high priority issues that are still open (all time)
    const { data: openCriticalHighIssues } = await supabase
      .from("issues")
      .select("*")
      .eq("project_id", project_id)
      .or("severity.eq.critical,priority.eq.immediate,priority.eq.high")
      .or("status.is.null,status.eq.backlog,status.eq.todo")
      .order("severity", { ascending: true })
      .order("priority", { ascending: true });

    const stats = {
      weeklySessionCount: weeklySessions?.length || 0,
      weeklyUserCount: weeklyUsers?.length || 0,
      weeklyGroupCount: weeklyGroups?.length || 0,
      weeklyAverageSessionScore: weeklySessions?.length
        ? weeklySessions.reduce((sum, s) => sum + (s.score || 0), 0) /
          weeklySessions.length
        : 0,
      weeklyAverageUserScore: weeklyUsers?.length
        ? weeklyUsers.reduce((sum, u) => sum + (u.score || 0), 0) /
          weeklyUsers.length
        : 0,
      weeklyNewIssuesCount: weeklyNewIssues?.length || 0,
      openCriticalHighIssuesCount: openCriticalHighIssues?.length || 0,
    };

    console.log(`📋 [ANALYZE PROJECT] Weekly statistics:`);
    console.log(`   Sessions This Week: ${stats.weeklySessionCount}`);
    console.log(`   Active Users This Week: ${stats.weeklyUserCount}`);
    console.log(`   Active Groups This Week: ${stats.weeklyGroupCount}`);
    console.log(`   Total Features: ${features?.length || 0}`);
    console.log(
      `   Avg Session Score (Week): ${stats.weeklyAverageSessionScore.toFixed(1)}`,
    );
    console.log(
      `   Avg User Score (Week): ${stats.weeklyAverageUserScore.toFixed(1)}`,
    );
    console.log(`   New Issues This Week: ${stats.weeklyNewIssuesCount}`);
    console.log(
      `   Open Critical/High Issues: ${stats.openCriticalHighIssuesCount}`,
    );

    // Generate the weekly report
    console.log(`🤖 [ANALYZE PROJECT] Generating weekly report...`);

    // Prepare prompt for debugging
    const projectPrompt = ANALYZE_PROJECT_PROMPT({
      project,
      recentSessions: recentSessions || [],
      recentUsers: recentUsers || [],
      recentGroups: recentGroups || [],
      features: features || [],
      weeklyNewIssues: weeklyNewIssues || [],
      openCriticalHighIssues: openCriticalHighIssues || [],
      stats,
    });

    const { object } = await generateObject({
      model: openai.responses("gpt-5"),
      providerOptions: {
        openai: {
          reasoningEffort: "high",
          strictJsonSchema: true,
        } satisfies OpenAIResponsesProviderOptions,
      },
      system: ANALYZE_PROJECT_SYSTEM,
      schema: ANALYZE_PROJECT_SCHEMA,
      prompt: projectPrompt,
    });

    console.log(`📊 [ANALYZE PROJECT] Report generated successfully`);

    // Write debug file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await writeDebugFile(`debug-${timestamp}-analyze-project-${project_id}.txt`, {
      timestamp: new Date().toISOString(),
      job: "analyze-project",
      id: project_id,
      systemPrompt: ANALYZE_PROJECT_SYSTEM,
      userPrompt: projectPrompt,
      modelResponse: JSON.stringify(object, null, 2),
    });

    // Store the report (you might want to create a reports table for this)
    // For now, we'll just return the report
    // In production, you might want to:
    // 1. Store in a reports table
    // 2. Send via email
    // 3. Post to Slack
    // 4. Create Linear tickets for recommendations

    console.log(
      `✅ [ANALYZE PROJECT] Successfully analyzed project ${project_id}`,
    );

    // Return the report
    return NextResponse.json(
      {
        success: true,
        report: {
          project_id,
          generated_at: now,
          period_start: weekAgo,
          period_end: now,
          story: object.story,
          health: object.health,
          score: object.score,
          recommendation: object.recommendation,
          stats,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`💥 [ANALYZE PROJECT] Job failed:`, error);

    Sentry.captureException(error, {
      tags: { job: "analyzeProject" },
      extra: { projectId: (await request.json().catch(() => ({}))).project_id },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
