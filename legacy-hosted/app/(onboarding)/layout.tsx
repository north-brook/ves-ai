"use client";

import Logo from "@/app/(marketing)/logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ProgressBar from "./progress-bar";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Determine current step based on pathname
  let currentStep = 1;

  if (pathname.includes("/posthog")) {
    currentStep = 2;
  } else if (pathname.includes("/linear")) {
    currentStep = 3;
  } else if (pathname.includes("/welcome")) {
    currentStep = 4;
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="from-accent-purple/20 via-accent-pink/10 to-accent-orange/20 absolute inset-0 bg-gradient-to-br blur-3xl" />

      <nav className="bg-background/50 relative z-10 border-b border-slate-200 backdrop-blur-lg dark:border-slate-800/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </nav>

      <main className="relative z-10 px-6 py-16">
        <div className="mx-auto mb-12 max-w-2xl">
          <ProgressBar currentStep={currentStep} />
        </div>
        {children}
      </main>
    </div>
  );
}
