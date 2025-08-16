"use client";

import Link from "next/link";
import Google from "@/components/google";
import { Logo } from "./logo";

export function Navigation() {
  const handleSignIn = () => {
    // TODO: Implement Google sign-in
    console.log("Sign in with Google");
  };

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>

        <div className="flex items-center gap-8">
          <Link
            href="/pricing"
            className="font-medium text-foreground-secondary transition-colors hover:text-foreground"
          >
            Pricing
          </Link>

          <button
            onClick={handleSignIn}
            className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-2.5 font-medium transition-all duration-200 hover:bg-surface"
          >
            <Google size={18} />
            Sign in with Google
          </button>
        </div>
      </div>
    </nav>
  );
}
