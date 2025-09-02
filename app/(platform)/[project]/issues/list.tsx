"use client";

import { Issue, Project } from "@/types";
import IssueLine from "./line";
import useLiveIssues from "./live";

export default function IssueList({
  initialIssues,
  project,
}: {
  initialIssues: (Issue & {
    sessions: { id: string }[];
  })[];
  project: Project;
}) {
  const issues = useLiveIssues({ projectId: project.id, initialIssues });

  return (
    <div className="div w-full flex-col gap-4">
      {issues.map((issue) => (
        <IssueLine key={issue.id} issue={issue} />
      ))}
    </div>
  );
}
