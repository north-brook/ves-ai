import adminSupabase from "@/lib/supabase/admin";

export async function failProcessReplay(sessionId: string) {
  "use step";

  const supabase = adminSupabase();

  const { error: updateError } = await supabase
    .from("sessions")
    .update({ status: "failed" })
    .eq("id", sessionId);

  if (updateError) {
    console.error(
      `❌ [FAIL PROCESS REPLAY] Failed to update session status:`,
      updateError,
    );
    throw updateError;
  }

  console.log(`✅ [FAIL PROCESS REPLAY] Updated session status to failed`);
}
