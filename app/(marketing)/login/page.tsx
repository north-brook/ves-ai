import LogInButton, { LoadingLogInButton } from "@/app/auth/log-in-button";
import serverSupabase from "@/lib/supabase/server";
import { Suspense } from "react";

export default async function LogInPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="from-accent-purple/20 via-accent-pink/10 to-accent-orange/20 absolute inset-0 bg-gradient-to-br blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-[40vh]">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-display mb-6 text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
              Log in to VES
            </h1>
            <Suspense fallback={<LoadingLogInButton />}>
              <LoadedLogInButton />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}

async function LoadedLogInButton() {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  return <LogInButton authUser={authUser} />;
}
