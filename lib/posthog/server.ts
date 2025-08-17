import { PostHog } from "posthog-node";

const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
  flushAt: 1,
  flushInterval: 0,
  enableExceptionAutocapture: true,
});

export default posthog;
