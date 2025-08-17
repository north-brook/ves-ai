import serverSupabase from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function GET() {
  const supabase = await serverSupabase();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
