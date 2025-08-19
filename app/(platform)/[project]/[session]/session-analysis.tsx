import { Markdown } from "@/components/markdown";

interface SessionAnalysisProps {
  synthesis: string | null;
}

export function SessionAnalysis({ synthesis }: SessionAnalysisProps) {
  if (!synthesis) {
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
      <Markdown>{synthesis}</Markdown>
    </div>
  );
}
