import { kickoff } from "./kickoff";
import { processRecording } from "./process-recording";
import { pullGroups } from "./pull-groups";
import { pullRecordings } from "./pull-recordings";

export async function sync(sourceId: string) {
  "use workflow";

  // pull groups and recordings from source in parallel
  const [{ groupNames, groupProperties }, recordings] = await Promise.all([
    pullGroups(sourceId),
    pullRecordings(sourceId),
  ]);

  // for each session
  for (const recording of recordings) {
    // process session
    const sessionId = await processRecording({
      sourceId,
      recording,
      groupNames,
      groupProperties,
    });

    // kickoff analysis for session
    await kickoff(sessionId);
  }
}
