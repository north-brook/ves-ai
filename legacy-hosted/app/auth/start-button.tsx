"use client";

import Google from "@/components/icons/google";
import { cn } from "@/lib/utils";
import { AuthUser } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { googleAuth } from "./actions";

export default function StartButton({
  variant = "primary",
  authUser,
}: {
  variant?: "primary" | "secondary";
  authUser?: AuthUser | null;
}) {
  const next = useSearchParams().get("next");
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
            className="group from-accent-purple via-accent-pink to-accent-orange relative rounded-lg bg-gradient-to-r p-[2px] text-lg font-semibold transition-all duration-200"
          >
            <div className="bg-background group-hover:bg-background/90 flex items-center gap-2 rounded-[10px] px-8 py-4 transition-all">
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
          className="group from-accent-purple via-accent-pink to-accent-orange relative rounded-lg bg-gradient-to-r p-[2px] text-lg font-semibold transition-all duration-200"
        >
          <div className="bg-background group-hover:bg-background/90 flex items-center gap-2 rounded-[6px] px-8 py-4 transition-all">
            <Google size={20} />
            <span className="text-foreground font-semibold">
              Continue with Google
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

        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          100 free sessions per month. No credit card required.
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
            className="bg-background hidden items-center gap-2 rounded-lg border border-slate-200 px-6 py-2.5 font-medium transition-all duration-200 hover:bg-slate-50 md:flex dark:border-slate-800 dark:hover:bg-slate-900"
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
          className="bg-background hidden items-center gap-2 rounded-lg border border-slate-200 px-6 py-2.5 font-medium transition-all duration-200 hover:bg-slate-50 md:flex dark:border-slate-800 dark:bg-slate-900"
        >
          {googleAuthMutation.isIdle ? (
            <Google size={18} />
          ) : (
            <LoaderCircle size={18} className="text-foreground animate-spin" />
          )}
          Continue with Google
        </button>
      </form>
    );
  }
}

export function LoadingStartButton({
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
          "h-[46px] w-[223px] animate-pulse bg-slate-50 transition-all duration-200 dark:bg-slate-900",
      )}
    />
  );
}
