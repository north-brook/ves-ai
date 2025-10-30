import { NextRequest, NextResponse } from "next/server";
import adminSupabase from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";

export type AcceptedPayload = {
  session_id: string;
  external_id: string;
};

export async function POST(request: NextRequest) {
  try {
    const payload: AcceptedPayload = await request.json();

    console.log(`📥 [ACCEPTED] Cloud service accepted job`);
    console.log(`   Session: ${payload.session_id}`);
    console.log(`   Recording: ${payload.external_id}`);

    const supabase = adminSupabase();

    // Update session status to processing
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ status: "processing", processed_at: new Date().toISOString() })
      .eq("id", payload.session_id)
      .eq("status", "pending"); // Only update if still pending

    if (updateError) {
      console.error(
        `❌ [ACCEPTED] Failed to update session ${payload.session_id}:`,
        updateError,
      );
      throw updateError;
    }

    console.log(`✅ [ACCEPTED] Session ${payload.session_id} → processing`);

    return NextResponse.json({
      success: true,
      session_id: payload.session_id,
      message: "Session status updated to processing",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error(`💥 [ACCEPTED] Failed to process acceptance:`, error);

    Sentry.captureException(error, {
      tags: { job: "process-replay-accepted" },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
