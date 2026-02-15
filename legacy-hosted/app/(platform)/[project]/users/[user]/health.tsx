"use client";

import Markdown from "@/components/markdown";
import { getScoreColor } from "@/lib/score";

export default function UserHealth({
  score,
  health,
}: {
  score: number | null;
  health: string | null;
}) {
  if (score === null || health === null) return null;

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: getScoreColor(score, 0.3),
        backgroundColor: getScoreColor(score, 0.1),
      }}
    >
      <Markdown>{health}</Markdown>
    </div>
  );
}
