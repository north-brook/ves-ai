import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
  person_profiles: "identified_only",
  capture_pageview: false,
  mask_all_text: false,
  session_recording: {
    maskAllInputs: false,
    maskInputOptions: {
      password: true,
    },
  },
});

Sentry.init({
  dsn: "https://97f2bbb3613cf5b7c49203fd8e43447b@o4508679619215360.ingest.us.sentry.io/4509855273451520",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
