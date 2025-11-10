"use client";

import Markdown from "@/components/markdown";

export default function UserStory({ story }: { story: string | null }) {
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
