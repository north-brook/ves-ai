import { Issue } from "@/types";

export default function IssueLine({
  issue,
}: {
  issue: Issue & {
    sessions: { id: string }[];
  };
}) {
  return (
    <div>
      <h2>{issue.name}</h2>
    </div>
  );
}
