import serverSupabase from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next");

  const supabase = await serverSupabase();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect(next ? next : "/");
}
