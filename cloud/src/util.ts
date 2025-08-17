export const redact = (s?: string) =>
  s ? s.replace(/([A-Za-z0-9_\-]{5})[A-Za-z0-9_\-]+/g, "$1…") : s;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const hostForRegion = (region: string): string => {
  if (!region) return "https://us.posthog.com";
  const r = region.toLowerCase();
  if (r === "us") return "https://us.posthog.com";
  if (r === "eu") return "https://eu.posthog.com";
  if (r === "app") return "https://app.posthog.com";
  // allow custom PostHog hosts, e.g. self-hosted
  if (/^https?:\/\//.test(region)) return region.replace(/\/+$/, "");
  return "https://us.posthog.com";
};

// Cap recording at 30 minutes as a hard safety guard
export const clampMs = (ms: number, min = 10_000, max = 30 * 60_000) =>
  Math.min(Math.max(ms, min), max);
