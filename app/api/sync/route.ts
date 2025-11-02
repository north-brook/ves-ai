import adminSupabase from "@/lib/supabase/admin";
import { sync } from "@/workflows/sync";
import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  try {
    // Verify CRON_SECRET for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("🚫 Unauthorized cron job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (projectId) {
      console.log(
        `🎯 [SYNC SESSIONS] Starting job run for specific project: ${projectId} at`,
        new Date().toISOString(),
      );
    } else {
      console.log(
        "🚀 [SYNC SESSIONS] Starting job run for all projects at",
        new Date().toISOString(),
      );
    }

    const supabase = adminSupabase();

    const sourcesQuery = supabase
      .from("sources")
      .select("id")
      .not("last_active_at", "is", null);
    if (projectId) sourcesQuery.eq("project_id", projectId);

    const { data: sources } = await sourcesQuery;

    for (const source of sources || []) {
      console.log(
        `🎯 [SYNC SESSIONS] Starting sync workflow for source: ${source.id} at`,
        new Date().toISOString(),
      );
      await start(sync, [source.id]);
    }

    console.log(
      `🎯 [SYNC SESSIONS] All sync workflows started at`,
      new Date().toISOString(),
    );
  } catch (error) {
    console.error("🚫 [SYNC SESSIONS] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
