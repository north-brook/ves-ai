import { AlertCircle, ArrowRight, Home } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication Error • VES AI",
  description: "An error occurred during authentication. Please try again.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>;
}) {
  const params = await searchParams;
  const errorMessage =
    params.error_description ||
    params.error ||
    "An error occurred during authentication.";

  return (
    <div className="bg-background text-foreground min-h-screen">
      <section className="relative overflow-hidden">
        <div className="from-accent-purple/20 via-accent-pink/10 to-accent-orange/20 absolute inset-0 bg-gradient-to-br blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-[30vh]">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 flex justify-center">
              <div className="from-red-500/20 to-red-600/20 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br">
                <AlertCircle
                  size={48}
                  className="text-red-500 dark:text-red-400"
                />
              </div>
            </div>

            <h1 className="font-display mb-4 text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
              Authentication Error
            </h1>

            <p className="text-slate-600 dark:text-slate-400 mx-auto mb-8 max-w-2xl text-lg">
              {errorMessage}
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="group font-display from-accent-purple via-accent-pink to-accent-orange relative rounded-lg bg-gradient-to-r p-[2px] text-lg font-semibold transition-all duration-200"
              >
                <div className="bg-background group-hover:bg-background/90 flex items-center gap-2 rounded-[6px] px-8 py-4 transition-all">
                  <span className="text-foreground font-semibold">
                    Try Again
                  </span>
                  <ArrowRight className="text-foreground h-5 w-5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              <Link
                href="/"
                className="border-border bg-background hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center gap-2 rounded-lg border px-8 py-4 font-medium transition-all duration-200"
              >
                <Home className="text-foreground h-5 w-5" />
                <span className="text-foreground font-semibold">
                  Back to Home
                </span>
              </Link>
            </div>

            <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
