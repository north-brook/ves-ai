import { Markdown } from "@/components/markdown";

interface SessionAnalysisProps {
  analysis: string | null;
}

export function SessionAnalysis({ analysis }: SessionAnalysisProps) {
  if (!analysis) {
    return (
      <p className="text-sm text-foreground-secondary italic">
        No analysis available yet.
      </p>
    );
  }

  return <Markdown>{analysis}</Markdown>;
}