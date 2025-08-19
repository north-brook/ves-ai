import { Markdown } from "@/components/markdown";

interface SessionTldrProps {
  tldr: string | null;
}

export function SessionTldr({ tldr }: SessionTldrProps) {
  if (!tldr) {
    return null;
  }

  return (
    <div className="border-border bg-surface rounded-lg border p-6">
      <h2 className="font-display mb-4 text-xl font-semibold">TL;DR</h2>
      <div className="text-foreground-secondary">
        <Markdown>{tldr}</Markdown>
      </div>
    </div>
  );
}