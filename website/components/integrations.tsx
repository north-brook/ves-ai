import { Film } from "lucide-react";
import GoogleCloud from "./icons/google-cloud";
import Playwright from "./icons/playwright";
import PostHog from "./icons/posthog";
import { Section } from "./section";

const integrations = [
  {
    name: "PostHog",
    detail: "Session recordings & product analytics",
    logo: <PostHog className="text-text-muted" size={24} />,
  },
  {
    name: "Google Cloud",
    detail: "Vertex AI, Gemini, Cloud Storage",
    logo: <GoogleCloud className="text-text-muted" size={28} />,
  },
  {
    name: "Playwright",
    detail: "Browser-based replay rendering",
    logo: <Playwright className="text-text-muted" size={28} />,
  },
  {
    name: "ffmpeg",
    detail: "Video & frame processing",
    logo: <Film className="text-text-muted" size={28} strokeWidth={1.5} />,
  },
];

export function Integrations() {
  return (
    <Section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <h2 className="text-center font-bold text-3xl text-text-primary tracking-tight sm:text-4xl">
        Integrations
      </h2>

      <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
        {integrations.map((item) => (
          <div
            className="flex flex-col items-center gap-4 text-center"
            key={item.name}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border-subtle bg-bg-elevated">
              {item.logo}
            </div>
            <div>
              <span className="font-semibold text-base text-text-primary">
                {item.name}
              </span>
              <p className="mt-1 text-sm text-text-muted">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
