import serverSupabase from "@/lib/supabase/server";
import IssueCard from "../issues/card";
import { platformConfig } from "../queries";

export default async function PriorityIssues({
  projectSlug,
}: {
  projectSlug: string;
}) {
  const supabase = await serverSupabase();

  const { project } = await platformConfig({ projectSlug });

  const { data: issues, error: issuesError } = await supabase
    .from("issues")
    .select("*, sessions(id)")
    .eq("project_id", project.id)
    .eq("confidence", "high")
    .in("priority", ["immediate", "high"])
    .limit(100);

  // filter for issues with at least one session
  // sort by number of sessions
  // limit to 12
  const priorityIssues = issues
    ?.filter((issue) => issue.sessions.length > 1)
    ?.sort((a, b) => b.sessions.length - a.sessions.length)
    ?.slice(0, 12);

  if (issuesError) console.error(issuesError);

  return (
    <div className="w-full">
      <h2 className="text-foreground mb-4 text-xl font-medium">
        Priority Issues
      </h2>
      {priorityIssues?.length && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {priorityIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PriorityIssuesSkeleton() {
  return <div></div>;
}
