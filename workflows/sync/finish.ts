import adminSupabase from "@/lib/supabase/admin";

export async function finish(sourceId: string) {
  "use step";

  const supabase = adminSupabase();

  // update source last_active_at
  const { error: updateError } = await supabase
    .from("sources")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", sourceId);

  if (updateError) {
    console.error(
      `⚠️ [SYNC SESSIONS] Failed to update source last_active_at:`,
      updateError,
    );
  }
}
