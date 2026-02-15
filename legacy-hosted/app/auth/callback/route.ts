import { NextResponse } from "next/server";
import serverSupabase from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { syncAuth } from "@/app/auth/actions";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await serverSupabase();
    console.log("exchanging code for session", code);
    const { data: auth, error } =
      await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("error exchanging code for session", error);
      Sentry.captureException(error, {
        tags: { action: "authCallback", step: "exchangeCodeForSession" },
        extra: { code },
      });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL}/auth/error`);
    } else {
      const syncResult = await syncAuth({
        authUser: auth.user,
        authSession: auth.session,
        next,
      });
      if ("error" in syncResult) {
        console.error(syncResult.error);
        Sentry.captureException(new Error(syncResult.error), {
          tags: { action: "authCallback", step: "syncAuth" },
          extra: { userId: auth.user?.id },
        });
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_URL}/auth/error`,
        );
      }

      const redirectTo = next
        ? next
        : syncResult.project
          ? `/${syncResult.project.slug}`
          : "/new";

      revalidatePath("/", "layout");

      console.log(
        "redirecting to",
        `${process.env.NEXT_PUBLIC_URL}${redirectTo}`,
      );

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}${redirectTo}`,
      );
    }
  }

  // return the user to an error page with instructions
  console.error("No auth code");
  Sentry.captureMessage("No auth code in callback", {
    level: "warning",
    tags: { action: "authCallback" },
  });
  return NextResponse.redirect(`${origin}/auth/error`);
}
