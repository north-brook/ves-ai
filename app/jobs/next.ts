import kickoff from "./sync/kickoff";

export default async function next(projectId: string) {
  "use step";

  await kickoff(projectId);
}
