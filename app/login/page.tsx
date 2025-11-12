import LogInButton from "@/app/auth/log-in-button";
import VES from "@/components/icons/ves";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login • VES AI",
  description:
    "Log in to VES AI to access your AI-powered session analysis dashboard.",
};

export default async function LogInPage() {
  return (
    <main className="relative h-screen overflow-hidden">
      <div className="from-accent-purple/20 via-accent-pink/10 to-accent-orange/20 absolute inset-0 bg-gradient-to-br blur-3xl" />

      <div className="flex h-full flex-col items-center justify-center gap-8 p-6">
        <VES size={100} />
        <h1 className="font-display text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
          Log in
        </h1>
        <LogInButton />
      </div>
    </main>
  );
}
