"use client";

import { Project, ProjectGroup, ProjectUser } from "@/types";
import UserLine from "./line";
import useLiveUsers from "./live";

export default function UserList({
  initialUsers,
  project,
}: {
  initialUsers: (ProjectUser & {
    group: ProjectGroup | null;
  })[];
  project: Project;
}) {
  const users = useLiveUsers({ projectId: project.id, initialUsers });

  return (
    <div className="div w-full flex-col gap-4">
      {users.map((user) => (
        <UserLine key={user.id} user={user} />
      ))}
    </div>
  );
}
