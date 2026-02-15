import StartButton, { LoadingStartButton } from "@/app/auth/start-button";
import serverSupabase from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";
import Logo from "./logo";

export default async function MarketingNav() {
  return (
    <nav className="bg-background/80 sticky top-0 z-50 w-full border-b border-slate-200 backdrop-blur-lg dark:border-slate-800">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2.5">
        <Link href="/">
          <Logo />
        </Link>

        <div className="flex items-center md:gap-8">
          <Link
            href="/pricing"
            className="hover:text-foreground font-medium text-slate-600 transition-colors dark:text-slate-400"
          >
            Pricing
          </Link>

          <Suspense fallback={<LoadingStartButton variant="secondary" />}>
            <LoadedStartButton variant="secondary" />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}

async function LoadedStartButton({
  variant,
}: {
  variant: "primary" | "secondary";
}) {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  return <StartButton authUser={authUser} variant={variant} />;
}
