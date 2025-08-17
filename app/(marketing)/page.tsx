import {
  ArrowRight,
  Eye,
  Zap,
  Plug,
  Bug,
  Lightbulb,
  Activity,
  ListChecks,
  Users,
  Rocket,
  Target,
} from "lucide-react";
import Google from "@/components/google";
import PostHog from "@/components/posthog";
import Linear from "@/components/linear";
import LogInButton, { LoadingLogInButton } from "@/app/auth/log-in-button";
import serverSupabase from "@/lib/supabase/server";
import { Suspense } from "react";

export default async function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="from-accent-purple/20 via-accent-pink/10 to-accent-orange/20 absolute inset-0 bg-gradient-to-br blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-display mb-6 text-5xl leading-tight font-bold md:text-6xl lg:text-7xl">
              Watch and analyze every user session with AI
            </h1>
            <p className="text-foreground-secondary mx-auto mb-10 max-w-2xl items-end text-xl">
              Connect{" "}
              <PostHog size={20} className="mx-1 inline-block align-baseline" />
              , and VES will review your replays, find bugs, identify
              opportunities, and prepare rich tickets for{" "}
              <Linear size={20} className="mx-1 inline-block align-baseline" />.
            </p>

            <Suspense fallback={<LoadingLogInButton />}>
              <LoadedLogInButton />
            </Suspense>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display mb-16 text-center text-4xl font-bold md:text-5xl">
            How It Works
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="relative">
              <div className="from-accent-purple to-accent-pink mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
                <Plug className="h-8 w-8" />
              </div>
              <h3 className="font-display mb-3 text-2xl font-bold">
                1. Connect{" "}
                <PostHog
                  size={24}
                  className="ml-1 inline-block align-baseline"
                />
              </h3>
              <p className="text-foreground-secondary">
                We instantly start watching every session replay.
              </p>
            </div>

            <div className="relative">
              <div className="from-accent-pink to-accent-orange mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
                <Eye className="h-8 w-8" />
              </div>
              <h3 className="font-display mb-3 text-2xl font-bold">
                2. AI Review
              </h3>
              <p className="text-foreground-secondary">
                Every session is analyzed for bugs, friction points, and
                opportunities.
              </p>
            </div>

            <div className="relative">
              <div className="from-accent-orange to-accent-purple mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
                <ListChecks className="h-8 w-8" />
              </div>
              <h3 className="font-display mb-3 text-2xl font-bold">
                3. Action in{" "}
                <Linear
                  size={24}
                  className="ml-1 inline-block align-baseline"
                />
              </h3>
              <p className="text-foreground-secondary">
                Clear, prioritized tickets appear in your backlog automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Use VES */}
      <section className="bg-surface px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display mb-16 text-center text-4xl font-bold md:text-5xl">
            Why Use VES
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex gap-4">
              <Bug className="text-accent-purple mt-1 h-6 w-6 flex-shrink-0" />
              <div>
                <h3 className="font-display mb-2 text-xl font-bold">
                  Catch every issue
                </h3>
                <p className="text-foreground-secondary">
                  No more relying on random QA or user complaints
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Lightbulb className="text-accent-pink mt-1 h-6 w-6 flex-shrink-0" />
              <div>
                <h3 className="font-display mb-2 text-xl font-bold">
                  Ship better features
                </h3>
                <p className="text-foreground-secondary">
                  Ideas come from real user behavior
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Zap className="text-accent-orange mt-1 h-6 w-6 flex-shrink-0" />
              <div>
                <h3 className="font-display mb-2 text-xl font-bold">
                  Save PM time
                </h3>
                <p className="text-foreground-secondary">
                  AI handles the review work for you
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Activity className="text-accent-purple mt-1 h-6 w-6 flex-shrink-0" />
              <div>
                <h3 className="font-display mb-2 text-xl font-bold">
                  No workflow changes
                </h3>
                <p className="text-foreground-secondary">
                  Everything appears in Linear
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display mb-16 text-center text-4xl font-bold md:text-5xl">
            Who It&apos;s For
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="border-border bg-surface rounded-2xl border p-8">
              <Rocket className="text-accent-purple mb-4 h-8 w-8" />
              <h3 className="font-display mb-3 text-xl font-bold">
                Product teams who want to ship faster
              </h3>
            </div>

            <div className="border-border bg-surface rounded-2xl border p-8">
              <Users className="text-accent-pink mb-4 h-8 w-8" />
              <h3 className="font-display mb-3 text-xl font-bold">
                Startups who need PM superpowers without hiring
              </h3>
            </div>

            <div className="border-border bg-surface rounded-2xl border p-8">
              <Target className="text-accent-orange mb-4 h-8 w-8" />
              <h3 className="font-display mb-3 text-xl font-bold">
                SaaS companies who want zero missed bugs or UX issues
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pt-32 pb-48">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-display mb-6 text-4xl font-bold md:text-5xl">
            Get Started
          </h2>

          <Suspense fallback={<LoadingLogInButton />}>
            <LoadedLogInButton />
          </Suspense>
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
