import adminSupabase from "@/lib/supabase/admin";

export async function fail(sessionId: string) {
  "use step";

  const supabase = adminSupabase();

  const { error: updateError } = await supabase
    .from("sessions")
    .update({ status: "failed" })
    .eq("id", sessionId);

  if (updateError) {
    console.error(
      `❌ [FAIL ANALYSIS] Failed to update session status:`,
      updateError,
    );
    throw updateError;
  }

  console.log(`✅ [FAIL ANALYSIS] Updated session status to failed`);
}
