import { Check } from "lucide-react";
import { Suspense } from "react";
import LogInButton, { LoadingLogInButton } from "@/app/auth/log-in-button";
import serverSupabase from "@/lib/supabase/server";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    hours: "20 hours of monthly analysis",
    sessions: "~1,000 monthly sessions",
    price: "$199",
    description: "Early-stage startups",
    popular: false,
  },
  {
    name: "Growth",
    hours: "100 hours of monthly analysis",
    sessions: "~5,000 monthly sessions",
    price: "$699",
    description: "Growing product teams",
    popular: true,
  },
  {
    name: "Scale",
    hours: "300 hours of monthly analysis",
    sessions: "~15,000 monthly sessions",
    price: "$1,999",
    description: "Mid-market SaaS",
    popular: false,
  },
  {
    name: "Enterprise",
    hours: "Unlimited analysis",
    sessions: "Unlimited",
    price: "Custom",
    description: "Large orgs with special needs",
    popular: false,
  },
];

const features = [
  "Full AI session analysis",
  "Bug, UX, and feature suggestions",
  "Direct Linear integration",
  "Priority scoring & duplicate detection",
];

export default function PricingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-24">
        <div className="from-accent-purple/10 via-accent-pink/5 to-accent-orange/10 absolute inset-0 bg-gradient-to-br blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h1 className="font-display mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
              Simple plans. No overages. No surprises.
            </h1>

            <p className="text-foreground-secondary mx-auto max-w-2xl text-xl">
              Pick the plan that matches how many sessions you want VES to watch
              each month.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? "from-accent-purple/10 to-accent-purple/5 border-accent-purple border-2 bg-gradient-to-b"
                    : "bg-surface border-border border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 right-0 left-0 flex w-full justify-center">
                    <span className="from-accent-purple to-accent-pink rounded-full bg-gradient-to-r px-3 py-1 text-xs font-medium text-white">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="flex flex-col items-stretch justify-start gap-4">
                  <h3 className="font-display text-2xl font-bold">
                    {plan.name}
                  </h3>

                  <div className="space-y-1">
                    <div className="text-3xl font-bold">
                      {plan.price}
                      {plan.price !== "Custom" && (
                        <span className="text-foreground-secondary text-lg font-normal">
                          /mo
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-border space-y-2 border-y py-4">
                    <p className="text-foreground">{plan.hours}</p>
                    <p className="text-foreground-secondary text-sm">
                      {plan.sessions}
                    </p>
                  </div>

                  <p className="text-foreground-secondary text-sm">
                    {plan.description}
                  </p>

                  <Suspense
                    fallback={
                      <LoadingPricingButton
                        variant={
                          plan.popular
                            ? "popular"
                            : plan.name === "Enterprise"
                              ? "enterprise"
                              : "default"
                        }
                      />
                    }
                  >
                    <LoadedPricingButton
                      variant={
                        plan.popular
                          ? "popular"
                          : plan.name === "Enterprise"
                            ? "enterprise"
                            : "default"
                      }
                    />
                  </Suspense>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All Plans Include */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-12 text-center text-3xl font-bold">
            All plans include
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <div className="from-accent-purple to-accent-pink mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r">
                  <Check size={16} className="stroke-white" />
                </div>
                <p className="text-foreground">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Billing Works */}
      <section className="bg-surface px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-12 text-center text-3xl font-bold">
            How billing works
          </h2>

          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-accent-purple">•</span>
              <p className="text-foreground">
                No credit card needed for 7-day free trial
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-accent-pink">•</span>
              <p className="text-foreground">Cancel anytime — no lock-in</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-accent-orange">•</span>
              <p className="text-foreground">
                Upgrade when you need more analysis hours
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 pt-32 pb-48">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-display mb-6 text-center text-3xl font-bold">
            Start in 2 minutes
          </h2>
          <Suspense fallback={<LoadingLogInButton />}>
            <LoadedLogInButton />
          </Suspense>
        </div>
      </section>
    </>
  );
}

function LoadingPricingButton({
  variant,
}: {
  variant: "default" | "popular" | "enterprise";
}) {
  switch (variant) {
    case "default":
      return (
        <div className="border-border bg-background hover:bg-surface h-[50px] w-full rounded-lg border py-3 font-medium transition-all duration-200" />
      );
    case "popular":
      return (
        <div className="group from-accent-purple via-accent-pink to-accent-orange relative h-[50px] w-full rounded-lg bg-gradient-to-r p-[2px] font-semibold transition-all duration-200">
          <div className="bg-background group-hover:bg-background/90 flex items-center justify-center rounded-[6px] py-3 transition-all" />
        </div>
      );
    case "enterprise":
      return (
        <div className="border-border bg-background hover:bg-surface block h-[50px] w-full rounded-lg border py-3 text-center font-medium transition-all duration-200" />
      );
  }
}

async function LoadedPricingButton({
  variant,
}: {
  variant: "default" | "popular" | "enterprise";
}) {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  switch (variant) {
    case "default":
      return (
        <Link
          href={authUser ? "/home" : "/login"}
          className="border-border bg-background hover:bg-surface mt-[2px] flex flex-row items-center justify-center rounded-lg border py-3 font-medium transition-all duration-200"
        >
          Get Started
        </Link>
      );
    case "popular":
      return (
        <Link
          href={authUser ? "/home" : "/login"}
          className="group from-accent-purple via-accent-pink to-accent-orange relative w-full rounded-lg bg-gradient-to-r p-[2px] font-semibold transition-all duration-200"
        >
          <div className="bg-background group-hover:bg-background/90 flex items-center justify-center rounded-[6px] py-3 transition-all">
            <span className="text-foreground font-semibold">Get Started</span>
          </div>
        </Link>
      );
    case "enterprise":
      return (
        <Link
          href="mailto:team@ves.ai?subject=Enterprise"
          className="border-border bg-background hover:bg-surface mt-[2px] block w-full rounded-lg border py-3 text-center font-medium transition-all duration-200"
        >
          Contact Sales
        </Link>
      );
  }
}

async function LoadedLogInButton() {
  const supabase = await serverSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  return <LogInButton authUser={authUser} />;
}
