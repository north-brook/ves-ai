import { ProjectGroup, ProjectUser } from "@/types";

export default function UserLine({
  user,
}: {
  user: ProjectUser & {
    group: ProjectGroup | null;
  };
}) {
  return <div>{user.name}</div>;
}
