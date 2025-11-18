import { writeDebugFile } from "@/lib/debug/helper";
import adminSupabase from "@/lib/supabase/admin";
import { google } from "@ai-sdk/google";
import { ThinkingLevel } from "@google/genai";
import * as Sentry from "@sentry/nextjs";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import {
  ANALYZE_PROJECT_PROMPT,
  ANALYZE_PROJECT_SCHEMA,
  ANALYZE_PROJECT_SYSTEM,
} from "./prompts";

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("🚫 Unauthorized WEEKLY job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = adminSupabase();

    // get all projects
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*");

    if (projectsError) {
      console.error("❌ [WEEKLY] Failed to fetch projects:", projectsError);
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { status: 500 },
      );
    }

    for (const project of projects) {
      console.log(
        `📊 [WEEKLY] Starting weekly analysis for project ${project.id}`,
      );

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
        session_issues(issue:issues(*))
      `,
        )
        .eq("project_id", project.id)
        .gte("created_at", weekAgo)
        .lte("created_at", now)
        .order("created_at", { ascending: false });

      if (sessionsError) {
        console.error(`❌ [WEEKLY] Failed to fetch sessions:`, sessionsError);
        throw new Error("Failed to fetch sessions");
      }

      // Fetch recent active users (users with sessions in last 7 days)
      const { data: recentUsers, error: usersError } = await supabase
        .from("project_users")
        .select("*")
        .eq("project_id", project.id)
        .gte("analyzed_at", weekAgo)
        .order("score", { ascending: false, nullsFirst: false });

      if (usersError) {
        console.error(`❌ [WEEKLY] Failed to fetch users:`, usersError);
        throw new Error("Failed to fetch users");
      }

      // Fetch recent active groups
      const { data: recentGroups, error: groupsError } = await supabase
        .from("project_groups")
        .select("*")
        .eq("project_id", project.id)
        .gte("analyzed_at", weekAgo)
        .order("score", { ascending: false, nullsFirst: false });

      if (groupsError) {
        console.error(`❌ [WEEKLY] Failed to fetch groups:`, groupsError);
        throw new Error("Failed to fetch groups");
      }

      // Calculate weekly statistics
      const { data: weeklySessions } = await supabase
        .from("sessions")
        .select("score")
        .eq("project_id", project.id)
        .gte("created_at", weekAgo)
        .lte("created_at", now)
        .not("score", "is", null);

      const { data: weeklyUsers } = await supabase
        .from("project_users")
        .select("score")
        .eq("project_id", project.id)
        .gte("analyzed_at", weekAgo)
        .not("score", "is", null);

      const { data: weeklyGroups } = await supabase
        .from("project_groups")
        .select("score")
        .eq("project_id", project.id)
        .gte("analyzed_at", weekAgo);

      // Fetch all new issues from this week
      const { data: weeklyNewIssues } = await supabase
        .from("issues")
        .select("*")
        .eq("project_id", project.id)
        .gte("created_at", weekAgo)
        .order("priority", { ascending: true })
        .order("severity", { ascending: true });

      // Fetch all critical/high priority issues that are still open (all time)
      const { data: openCriticalHighIssues } = await supabase
        .from("issues")
        .select("*")
        .eq("project_id", project.id)
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

      console.log(`📋 [WEEKLY] Weekly statistics:`);
      console.log(`   Sessions This Week: ${stats.weeklySessionCount}`);
      console.log(`   Active Users This Week: ${stats.weeklyUserCount}`);
      console.log(`   Active Groups This Week: ${stats.weeklyGroupCount}`);
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
      console.log(`🤖 [WEEKLY] Generating weekly report...`);

      // Prepare prompt for debugging
      const projectPrompt = ANALYZE_PROJECT_PROMPT({
        project,
        recentSessions: recentSessions || [],
        recentUsers: recentUsers || [],
        recentGroups: recentGroups || [],
        weeklyNewIssues: weeklyNewIssues || [],
        openCriticalHighIssues: openCriticalHighIssues || [],
        stats,
      });

      const { object } = await generateObject({
        model: google("gemini-3-pro-preview"),
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.HIGH,
            },
          },
        },
        system: ANALYZE_PROJECT_SYSTEM,
        schema: ANALYZE_PROJECT_SCHEMA,
        prompt: projectPrompt,
      });

      console.log(`📊 [WEEKLY] Report generated successfully`);

      // Write debug file
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      await writeDebugFile(
        `debug-${timestamp}-analyze-project-${project.id}.txt`,
        {
          timestamp: new Date().toISOString(),
          job: "analyze-project",
          id: project.id,
          systemPrompt: ANALYZE_PROJECT_SYSTEM,
          userPrompt: projectPrompt,
          modelResponse: JSON.stringify(object, null, 2),
        },
      );

      // Store the report (you might want to create a reports table for this)
      // For now, we'll just return the report
      // In production, you might want to:
      // 1. Store in a reports table
      // 2. Send via email
      // 3. Post to Slack
      // 4. Create Linear tickets for recommendations

      console.log(`✅ [WEEKLY] Successfully analyzed project ${project.id}`);
    }

    // Return the report
    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`💥 [WEEKLY] Job failed:`, error);

    Sentry.captureException(error, {
      tags: { job: "weekly" },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
