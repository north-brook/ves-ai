import { finish } from "./finish";
import { kickoff } from "./kickoff";
import { processRecording } from "./process-recording";
import { pullGroups } from "./pull-groups";
import { pullRecordings } from "./pull-recordings";
import { since } from "./since";

const MAX_PAGES = process.env.NODE_ENV === "development" ? 1 : Infinity;

export async function sync(sourceId: string) {
  "use workflow";

  // get since date and pull groups in parallel
  const [sinceDate, { groupNames, groupProperties }] = await Promise.all([
    since(sourceId),
    pullGroups(sourceId),
  ]);

  // paginate through recordings
  let hasNext = true;
  let offset = 0;
  let pageCount = 0;

  while (hasNext && pageCount < MAX_PAGES) {
    // pull one page of recordings
    const {
      recordings,
      hasNext: hasNextPage,
      nextOffset,
    } = await pullRecordings(sourceId, sinceDate, offset);

    // for each session in this page
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

    // move to next page
    hasNext = hasNextPage;
    offset = nextOffset;
    pageCount++;
  }

  // finish sync
  await finish(sourceId);
}
