"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import Google from "@/components/google";
import { useMutation } from "@tanstack/react-query";
import { googleAuth } from "./actions";
import { AuthUser } from "@supabase/supabase-js";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LogInButton({
  variant = "primary",
  authUser,
}: {
  variant?: "primary" | "secondary";
  authUser?: AuthUser | null;
}) {
  const googleAuthMutation = useMutation({
    mutationFn: googleAuth,
    onSettled: (data) => {
      if (data?.error) toast.error(data.error);
    },
  });

  if (variant === "primary") {
    if (authUser) {
      return (
        <div className="flex w-full flex-col items-center gap-2">
          <Link
            href="/home"
            className="group font-display from-accent-purple via-accent-pink to-accent-orange relative rounded-lg bg-gradient-to-r p-[2px] text-lg font-semibold transition-all duration-200"
          >
            <div className="bg-background group-hover:bg-background/90 flex items-center gap-2 rounded-[6px] px-8 py-4 transition-all">
              <span className="text-foreground font-semibold">Dashboard</span>
              <ArrowRight className="text-foreground h-5 w-5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      );
    }

    return (
      <form
        action={googleAuthMutation.mutate}
        className="flex w-full flex-col items-center gap-2"
      >
        <button
          type="submit"
          className="group font-display from-accent-purple via-accent-pink to-accent-orange relative rounded-lg bg-gradient-to-r p-[2px] text-lg font-semibold transition-all duration-200"
        >
          <div className="bg-background group-hover:bg-background/90 flex items-center gap-2 rounded-[6px] px-8 py-4 transition-all">
            <Google size={20} />
            <span className="text-foreground font-semibold">
              Sign in with Google
            </span>
            {googleAuthMutation.isIdle ? (
              <ArrowRight
                size={18}
                className="text-foreground transition-transform group-hover:translate-x-1"
              />
            ) : (
              <LoaderCircle
                size={18}
                className="text-foreground animate-spin transition-transform group-hover:translate-x-1"
              />
            )}
          </div>
        </button>

        <p className="text-foreground-secondary mt-4 text-sm">
          1 hour of free analysis. No credit card required.
        </p>
      </form>
    );
  }

  if (variant === "secondary") {
    if (authUser) {
      return (
        <div>
          <Link
            href="/home"
            className="border-border bg-background hover:bg-surface hidden items-center gap-2 rounded-lg border px-6 py-2.5 font-medium transition-all duration-200 md:flex"
          >
            <span className="text-foreground font-semibold">Dashboard</span>
            <ArrowRight className="text-foreground hidden h-5 w-5 transition-transform group-hover:translate-x-1 md:block" />
          </Link>
        </div>
      );
    }

    return (
      <form action={googleAuthMutation.mutate}>
        <button
          type="submit"
          className="border-border bg-background hover:bg-surface hidden items-center gap-2 rounded-lg border px-6 py-2.5 font-medium transition-all duration-200 md:flex"
        >
          {googleAuthMutation.isIdle ? (
            <Google size={18} />
          ) : (
            <LoaderCircle size={18} className="text-foreground animate-spin" />
          )}
          Sign in with Google
        </button>
      </form>
    );
  }
}

export function LoadingLogInButton({
  variant,
}: {
  variant?: "primary" | "secondary";
}) {
  return (
    <div
      className={cn(
        variant === "primary" &&
          "from-accent-purple via-accent-pink to-accent-orange h-[60px] w-[280px] animate-pulse rounded-lg bg-gradient-to-r transition-all duration-200",
        variant === "secondary" &&
          "bg-surface h-[46px] w-[223px] animate-pulse transition-all duration-200",
      )}
    />
  );
}
