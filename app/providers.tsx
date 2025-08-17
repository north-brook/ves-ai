"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { usePostHog } from "posthog-js/react";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import clientSupabase from "@/lib/supabase/client";
import * as Sentry from "@sentry/nextjs";
const queryClient = new QueryClient();

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  // Track pageviews
  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + "?" + searchParams.toString();
      }

      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, posthog]);

  return null;
}

// Wrap PostHogPageView in Suspense to avoid the useSearchParams usage above
// from de-opting the whole app into client-side rendering
function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}

function PostHogProvider({ children }: { children: React.ReactNode }) {
  const supabase = clientSupabase();
  const posthog = usePostHog();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        posthog.identify(session?.user?.id, {
          email: session?.user?.email,
        });
        // Set user context for Sentry
        if (session?.user) {
          Sentry.setUser({
            id: session.user.id,
            email: session.user.email,
          });
        }
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
        // Clear Sentry user context
        Sentry.setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </PHProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster />
      <PostHogProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </PostHogProvider>
    </>
  );
}
