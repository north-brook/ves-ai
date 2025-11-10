"use client";

import Markdown from "@/components/markdown";

export default function SessionStory({ story }: { story: string | null }) {
  if (!story) return null;

  return <Markdown>{story}</Markdown>;
}
