"use client";

export function PostHogReplay({ replayUrl }: { replayUrl: string }) {
  return (
    <iframe
      frameBorder="0"
      allowFullScreen
      src={replayUrl}
      title="PostHog Session Replay"
      className="h-[400px] w-full rounded-lg md:h-[500px] lg:h-[600px]"
    />
  );
}
