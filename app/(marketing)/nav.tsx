import Link from "next/link";
import Logo from "./logo";
import serverSupabase from "@/lib/supabase/server";
import { Suspense } from "react";
import LogInButton, { LoadingLogInButton } from "../auth/log-in-button";

export default async function MarketingNav() {
  return (
    <nav className="border-border bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>

        <div className="flex items-center gap-8">
          <Link
            href="/pricing"
            className="text-slate-600 dark:text-slate-400 hover:text-foreground font-medium transition-colors"
          >
            Pricing
          </Link>

          <Suspense fallback={<LoadingLogInButton variant="secondary" />}>
            <LoadedLogInButton variant="secondary" />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}

async function LoadedLogInButton({
  variant,
}: {
  variant: "primary" | "secondary";
}) {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  return <LogInButton authUser={authUser} variant={variant} />;
}
