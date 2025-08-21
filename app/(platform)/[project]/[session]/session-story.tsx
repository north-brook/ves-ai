import { Markdown } from "@/components/markdown";

interface SessionStoryProps {
  story: string | null;
}

export function SessionStory({ story }: SessionStoryProps) {
  if (!story) {
    return (
      <div className="border-border bg-surface rounded-lg border p-6">
        <p className="text-foreground-secondary text-sm italic">
          No analysis available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-surface rounded-lg border p-6">
      <Markdown>{story}</Markdown>
    </div>
  );
}
