"use client";

import Markdown from "@/components/markdown";
import { getScoreColor } from "@/lib/score";
import { Session } from "@/types";
import SessionReplay from "../../replay";

export default function SessionContent({ session }: { session: Session }) {
  return (
    <div className="flex w-full flex-col gap-4">
      <SessionHealth score={session.score} health={session.health} />

      <SessionReplay sessionId={session.id} className="w-full" />

      <SessionStory story={session.story} />
    </div>
  );
}

function SessionHealth({
  score,
  health,
}: {
  score: number | null;
  health: string | null;
}) {
  if (!score || !health) return null;

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

function SessionStory({ story }: { story: string | null }) {
  if (!story) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-600 italic dark:text-slate-400">
          No analysis available yet.
        </p>
      </div>
    );
  }

  return <Markdown>{story}</Markdown>;
}
