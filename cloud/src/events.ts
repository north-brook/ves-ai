import { Storage } from "@google-cloud/storage";
import { gunzipSync, strFromU8, strToU8 } from "fflate";
import { promises as fs } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

// --------------------------------------------------------
// Types
// --------------------------------------------------------
type EventProcessingParams = {
  source_type: "posthog";
  source_host: string;
  source_key: string;
  source_project: string;
  external_id: string;
  project_id: string;
  session_id: string;
};

type SnapshotSource = {
  source: "blob" | "blob_v2" | "realtime";
  start_timestamp: string | null;
  end_timestamp: string | null;
  blob_key: string | null;
};

type RrwebEvent = {
  type: number;
  timestamp: number;
  delay?: number;
  data?: any;
  windowId?: string;
  [k: string]: any;
};

type RecordingSegment = {
  kind: "window" | "gap" | "buffer";
  startTimestamp: number;
  endTimestamp: number;
  duration: number;
  isActive: boolean;
  windowId?: string;
};

type EncodedSnapshot = {
  windowId?: string;
  window_id?: string;
  data?: any[];
  cv?: string; // compression version
  [k: string]: any;
};

type CompressedEvent = {
  cv: string;
  type: number;
  timestamp: number;
  data?: any;
  [k: string]: any;
};

// rrweb event types
const EventType = {
  DomContentLoaded: 0,
  Load: 1,
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Custom: 5,
  Plugin: 6,
} as const;

const IncrementalSource = {
  Mutation: 0,
  MouseMove: 1,
  MouseInteraction: 2,
  Scroll: 3,
  ViewportResize: 4,
  Input: 5,
  TouchMove: 6,
  MediaInteraction: 7,
  StyleSheetRule: 8,
  CanvasMutation: 9,
  Font: 10,
  Log: 11,
  Drag: 12,
  StyleDeclaration: 13,
  Selection: 14,
  AdoptedStyleSheet: 15,
} as const;

const MUTATION_CHUNK_SIZE = 5000;
const MAX_V2_KEYS_PER_BATCH = 20;

// --------------------------------------------------------
// Utility: Hashing for deduplication
// --------------------------------------------------------
/**
 * cyrb53 (c) 2018 bryc (github.com/bryc)
 * A fast and simple 53-bit string hash function with decent collision resistance.
 */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

// --------------------------------------------------------
// Decompression (PostHog style)
// --------------------------------------------------------
function isCompressedEvent(ev: any): ev is CompressedEvent {
  return typeof ev === "object" && ev !== null && "cv" in ev;
}

function unzip(compressedStr: string | undefined): any {
  if (!compressedStr) {
    return undefined;
  }
  try {
    return JSON.parse(strFromU8(gunzipSync(strToU8(compressedStr, true))));
  } catch (e) {
    console.warn("Failed to decompress:", e);
    return undefined;
  }
}

function decompressEvent(ev: any, sessionId: string): any {
  try {
    if (isCompressedEvent(ev)) {
      if (ev.cv === "2024-10") {
        if (ev.type === EventType.FullSnapshot && typeof ev.data === "string") {
          return {
            ...ev,
            data: unzip(ev.data),
          };
        } else if (
          ev.type === EventType.IncrementalSnapshot &&
          typeof ev.data === "object" &&
          "source" in ev.data
        ) {
          if (ev.data.source === IncrementalSource.StyleSheetRule) {
            return {
              ...ev,
              data: {
                ...ev.data,
                source: IncrementalSource.StyleSheetRule,
                adds: unzip(ev.data.adds),
                removes: unzip(ev.data.removes),
              },
            };
          } else if (
            ev.data.source === IncrementalSource.Mutation &&
            "texts" in ev.data
          ) {
            return {
              ...ev,
              data: {
                ...ev.data,
                source: IncrementalSource.Mutation,
                adds: unzip(ev.data.adds),
                removes: unzip(ev.data.removes),
                texts: unzip(ev.data.texts),
                attributes: unzip(ev.data.attributes),
              },
            };
          }
        }
      } else {
        console.warn(
          `Unknown compression version ${ev.cv} for session ${sessionId}`,
        );
        return ev;
      }
    }
    return ev;
  } catch (e) {
    console.error(`Decompression failed for session ${sessionId}:`, e);
    return ev;
  }
}

// --------------------------------------------------------
// Mutation chunking for large DOM changes
// --------------------------------------------------------
function chunkMutationSnapshot(snapshot: RrwebEvent): RrwebEvent[] {
  if (
    snapshot.type !== EventType.IncrementalSnapshot ||
    !snapshot.data ||
    typeof snapshot.data !== "object" ||
    snapshot.data.source !== IncrementalSource.Mutation ||
    !Array.isArray(snapshot.data.adds) ||
    snapshot.data.adds.length <= MUTATION_CHUNK_SIZE
  ) {
    return [snapshot];
  }

  const chunks: RrwebEvent[] = [];
  const { adds, removes, texts, attributes } = snapshot.data;
  const totalAdds = adds.length;
  const chunksCount = Math.ceil(totalAdds / MUTATION_CHUNK_SIZE);

  for (let i = 0; i < chunksCount; i++) {
    const startIdx = i * MUTATION_CHUNK_SIZE;
    const endIdx = Math.min((i + 1) * MUTATION_CHUNK_SIZE, totalAdds);
    const isFirstChunk = i === 0;
    const isLastChunk = i === chunksCount - 1;

    const chunkSnapshot: RrwebEvent = {
      ...snapshot,
      timestamp: snapshot.timestamp,
      data: {
        ...snapshot.data,
        adds: adds.slice(startIdx, endIdx),
        // Keep removes in the first chunk only
        removes: isFirstChunk ? removes : [],
        // Keep texts and attributes in the last chunk only
        texts: isLastChunk ? texts : [],
        attributes: isLastChunk ? attributes : [],
      },
    };

    if ("delay" in snapshot) {
      chunkSnapshot.delay = snapshot.delay || 0;
    }

    chunks.push(chunkSnapshot);
  }

  return chunks;
}

// --------------------------------------------------------
// Parse encoded snapshots (PostHog style)
// --------------------------------------------------------
async function parseEncodedSnapshots(
  items: any[],
  sessionId: string,
): Promise<RrwebEvent[]> {
  const unparseableLines: string[] = [];
  const parsedLines: RrwebEvent[] = [];

  for (const item of items) {
    if (!item) {
      // blob files have empty lines at the end
      continue;
    }

    try {
      let snapshotLine: EncodedSnapshot;

      if (typeof item === "string") {
        // Parse from blob or realtime storage
        snapshotLine = JSON.parse(item);
        if (Array.isArray(snapshotLine)) {
          // Convert old format [windowId, data] to new format
          snapshotLine = {
            windowId: snapshotLine[0],
            data: [snapshotLine[1]],
          };
        }
      } else {
        // Already parsed object
        snapshotLine = item;
      }

      let snapshotData: any[];
      if (
        typeof snapshotLine === "object" &&
        "type" in snapshotLine &&
        "timestamp" in snapshotLine
      ) {
        // Already an rrweb event
        snapshotData = [snapshotLine];
      } else if ("data" in snapshotLine && Array.isArray(snapshotLine.data)) {
        // Has data array
        snapshotData = snapshotLine.data;
      } else {
        // Single snapshot
        snapshotData = [snapshotLine];
      }

      const windowId =
        snapshotLine.windowId || snapshotLine.window_id || undefined;

      for (const d of snapshotData) {
        // Decompress if needed
        const decompressed = decompressEvent(d, sessionId);

        // Ensure it's a valid event
        if (
          decompressed &&
          typeof decompressed === "object" &&
          typeof decompressed.type === "number" &&
          typeof decompressed.timestamp === "number"
        ) {
          const event: RrwebEvent = {
            ...decompressed,
            windowId: decompressed.windowId || windowId,
          };

          // Apply chunking to large mutations
          const chunkedEvents = chunkMutationSnapshot(event);
          parsedLines.push(...chunkedEvents);
        }
      }
    } catch (e) {
      if (typeof item === "string") {
        unparseableLines.push(item);
      }
      console.warn(`Failed to parse snapshot: ${e}`);
    }
  }

  if (unparseableLines.length > 0) {
    console.warn(
      `Session ${sessionId} had ${unparseableLines.length} unparseable lines`,
    );
  }

  return parsedLines;
}

// --------------------------------------------------------
// Meta event patching
// --------------------------------------------------------
function patchMetaEvents(
  snapshots: RrwebEvent[],
  sessionId: string,
): RrwebEvent[] {
  const result: RrwebEvent[] = [];
  const metaEventsByWindow = new Map<string, RrwebEvent>();

  // First pass: collect meta events by window
  for (const snapshot of snapshots) {
    if (snapshot.type === EventType.Meta) {
      const windowId = snapshot.windowId || "main";
      metaEventsByWindow.set(windowId, snapshot);
    }
  }

  // Second pass: inject meta events before full snapshots if missing
  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    const windowId = snapshot.windowId || "main";

    if (snapshot.type === EventType.FullSnapshot) {
      const previousEvent = i > 0 ? snapshots[i - 1] : null;
      const needsMetaEvent =
        !previousEvent ||
        previousEvent.type !== EventType.Meta ||
        previousEvent.windowId !== windowId;

      if (needsMetaEvent && !metaEventsByWindow.has(windowId)) {
        // Try to extract viewport from the full snapshot
        let width = 1920;
        let height = 1080;
        let href = "";

        try {
          if (
            snapshot.data?.node?.childNodes?.[1]?.childNodes?.[1]
              ?.childNodes?.[0]?.attributes
          ) {
            const attrs =
              snapshot.data.node.childNodes[1].childNodes[1].childNodes[0]
                .attributes;
            const parsedWidth = parseInt(attrs.width, 10);
            const parsedHeight = parseInt(attrs.height, 10);
            // Only use parsed values if they're valid positive numbers
            if (Number.isFinite(parsedWidth) && parsedWidth > 0) {
              width = parsedWidth;
            }
            if (Number.isFinite(parsedHeight) && parsedHeight > 0) {
              height = parsedHeight;
            }
          }
          href = snapshot.data?.href || "";
        } catch (e) {
          console.warn(
            `Failed to extract viewport for session ${sessionId}, using defaults: ${width}x${height}`,
          );
        }

        const metaEvent: RrwebEvent = {
          type: EventType.Meta,
          timestamp: snapshot.timestamp,
          windowId: windowId,
          data: {
            width,
            height,
            href,
          },
        };

        result.push(metaEvent);
        metaEventsByWindow.set(windowId, metaEvent);
      }
    }

    result.push(snapshot);
  }

  return result;
}

// --------------------------------------------------------
// Segment creation for activity tracking
// --------------------------------------------------------

const ACTIVE_SOURCES = [
  IncrementalSource.MouseMove,
  IncrementalSource.MouseInteraction,
  IncrementalSource.Scroll,
  IncrementalSource.ViewportResize,
  IncrementalSource.Input,
  IncrementalSource.TouchMove,
  IncrementalSource.MediaInteraction,
  IncrementalSource.Drag,
];

const ACTIVITY_THRESHOLD_MS = 5000;

function isActiveEvent(event: RrwebEvent): boolean {
  return (
    event.type === EventType.FullSnapshot ||
    event.type === EventType.Meta ||
    (event.type === EventType.IncrementalSnapshot &&
      event.data?.source !== undefined &&
      ACTIVE_SOURCES.includes(event.data.source))
  );
}

function mapSnapshotsToWindowId(
  snapshots: RrwebEvent[],
): Record<string, RrwebEvent[]> {
  const snapshotsByWindowId: Record<string, RrwebEvent[]> = {};
  snapshots.forEach((snapshot) => {
    const windowId = snapshot.windowId || "main"; // Fallback to main if undefined
    if (!snapshotsByWindowId[windowId]) {
      snapshotsByWindowId[windowId] = [];
    }
    snapshotsByWindowId[windowId].push(snapshot);
  });
  return snapshotsByWindowId;
}

function createSegments(events: RrwebEvent[]): RecordingSegment[] {
  console.log(`🔍 [SEGMENTS] Creating segments for ${events.length} events`);

  if (events.length === 0) {
    return [];
  }

  const start = events[0].timestamp;
  const end = events[events.length - 1].timestamp;
  const snapshotsByWindowId = mapSnapshotsToWindowId(events);

  let segments: RecordingSegment[] = [];
  let activeSegment: Partial<RecordingSegment> | undefined;
  let lastActiveEventTimestamp = 0;

  events.forEach((snapshot, index) => {
    const eventIsActive = isActiveEvent(snapshot);

    // Fallback to 'main' if windowId is missing
    const currentWindowId = snapshot.windowId || "main";
    const previousWindowId = snapshot.windowId || "main";

    const previousSnapshot = events[index - 1];
    const isPreviousSnapshotLastForWindow =
      snapshotsByWindowId[previousWindowId]?.slice(-1)[0] === previousSnapshot;

    // When do we create a new segment?
    // 1. If we don't have one yet
    let isNewSegment = !activeSegment;

    // 2. If it is currently inactive but a new "active" event comes in
    if (eventIsActive && !activeSegment?.isActive) {
      isNewSegment = true;
    }

    // 3. If it is currently active but no new active event has been seen for the activity threshold
    if (
      activeSegment?.isActive &&
      lastActiveEventTimestamp + ACTIVITY_THRESHOLD_MS < snapshot.timestamp
    ) {
      isNewSegment = true;
    }

    // 4. If windowId changes we create a new segment
    if (activeSegment?.windowId !== currentWindowId && eventIsActive) {
      isNewSegment = true;
    }

    // 5. If there are no more snapshots for this windowId
    if (isPreviousSnapshotLastForWindow) {
      isNewSegment = true;
    }

    // NOTE: We have to make sure that we set this _after_ we use it
    lastActiveEventTimestamp = eventIsActive
      ? snapshot.timestamp
      : lastActiveEventTimestamp;

    if (isNewSegment) {
      if (activeSegment && activeSegment.startTimestamp !== undefined) {
        segments.push(activeSegment as RecordingSegment);
      }

      activeSegment = {
        kind: "window",
        startTimestamp: snapshot.timestamp,
        windowId: currentWindowId,
        isActive: eventIsActive,
      };
    }

    if (activeSegment) {
      activeSegment.endTimestamp = snapshot.timestamp;
    }
  });

  if (activeSegment && activeSegment.startTimestamp !== undefined) {
    segments.push(activeSegment as RecordingSegment);
  }

  // We've built the segments, but this might not account for "gaps" in them
  // To account for this we build up a new segment list filling in gaps with
  // either the tracked window if the viewing window is fixed
  // or whatever window is available (preferably the previous one)
  // Or a "null" window if there is nothing (like if they navigated away to a different site)
  const findWindowIdForTimestamp = (
    timestamp: number,
    preferredWindowId?: string,
  ): string | undefined => {
    // Check all the snapshotsByWindowId to see if the timestamp is within its range
    // prefer the preferredWindowId if it is within its range
    let windowIds = Object.keys(snapshotsByWindowId);
    if (preferredWindowId) {
      windowIds = [
        preferredWindowId,
        ...windowIds.filter((id) => id !== preferredWindowId),
      ];
    }

    for (const windowId of windowIds) {
      const snapshots = snapshotsByWindowId[windowId];
      if (
        snapshots.length > 0 &&
        snapshots[0].timestamp <= timestamp &&
        snapshots[snapshots.length - 1].timestamp >= timestamp
      ) {
        return windowId;
      }
    }
    return undefined;
  };

  segments = segments.reduce((acc, segment, index) => {
    const previousSegment = segments[index - 1];
    const list = [...acc];

    if (
      previousSegment &&
      segment.startTimestamp !== previousSegment.endTimestamp
    ) {
      // If the segments do not immediately follow each other, then we add a "gap" segment
      const startTimestamp = previousSegment.endTimestamp;
      const endTimestamp = segment.startTimestamp;

      // Offset the window ID check so we look for a subsequent segment
      const windowId = findWindowIdForTimestamp(
        startTimestamp + 1,
        previousSegment.windowId,
      );

      const gapSegment: Partial<RecordingSegment> = {
        kind: "gap",
        startTimestamp,
        endTimestamp,
        windowId,
        isActive: false,
      };
      list.push(gapSegment as RecordingSegment);
    }

    list.push(segment);
    return list;
  }, [] as RecordingSegment[]);

  // As we don't necessarily have all the segments at once, we add a final segment to fill the gap between the last segment and the end of the recording
  const latestTimestamp = segments[segments.length - 1]?.endTimestamp;

  if (!latestTimestamp || latestTimestamp < end) {
    segments.push({
      kind: "buffer",
      startTimestamp: latestTimestamp ? latestTimestamp + 1 : start,
      endTimestamp: end,
      isActive: false,
    } as RecordingSegment);
  }

  // if the first segment starts after the start of the session, add a gap segment at the beginning
  const firstTimestamp = segments[0]?.startTimestamp;
  if (firstTimestamp && firstTimestamp > start) {
    segments.unshift({
      kind: "gap",
      startTimestamp: start,
      endTimestamp: firstTimestamp,
      isActive: false,
    } as RecordingSegment);
  }

  segments = segments.map((segment) => {
    // These can all be done in a loop at the end...
    segment.duration = segment.endTimestamp - segment.startTimestamp;
    return segment;
  });

  console.log(`📊 [SEGMENTS] Created ${segments.length} segments:`);
  let totalActiveTime = 0;
  let totalInactiveTime = 0;
  segments.forEach((seg, i) => {
    const durationSec = seg.duration / 1000;
    if (seg.isActive) {
      totalActiveTime += seg.duration;
    } else {
      totalInactiveTime += seg.duration;
    }
    console.log(
      `  Segment ${i + 1} (${seg.kind}): ${seg.isActive ? "✅ Active" : "⏸️ Inactive"} - ${durationSec.toFixed(1)}s (${seg.startTimestamp}-${seg.endTimestamp})`,
    );
  });

  console.log(
    `  📊 Total active time: ${(totalActiveTime / 1000).toFixed(1)}s`,
  );
  console.log(
    `  📊 Total inactive time: ${(totalInactiveTime / 1000).toFixed(1)}s`,
  );
  console.log(
    `  📊 Time saved with skipping: ~${((totalInactiveTime * 0.98) / 1000).toFixed(1)}s`,
  );

  return segments;
}

// --------------------------------------------------------
// HTTP fetching utilities
// --------------------------------------------------------
async function fetchJSON<T>(
  url: string,
  headers: Record<string, string>,
  retries = 3,
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `HTTP ${response.status} for ${url}: ${text.slice(0, 500)}`,
        );
      }

      const text = await response.text();

      // Handle blob_v2 NDJSON format - returns newline-delimited JSON directly
      if (url.includes("source=blob_v2")) {
        const lines = text
          .trim()
          .split("\n")
          .filter((line) => line.trim());

        // blob_v2 returns the snapshots directly as NDJSON, not wrapped in an object
        return lines as any as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
      }
    }
  }

  throw lastError;
}

// --------------------------------------------------------
// Main function: fetch and process events
// --------------------------------------------------------
export default async function constructEvents(
  params: EventProcessingParams,
): Promise<{
  eventsPath: string;
  deviceWidth: number;
  deviceHeight: number;
  eventsUri: string;
}> {
  const {
    source_type,
    source_host,
    source_key,
    source_project,
    external_id,
    project_id,
    session_id,
  } = params;

  if (source_type !== "posthog") {
    throw new Error(`Unsupported source_type: ${source_type}`);
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${source_key}`,
  };

  // 1) List sources with blob_v2 support
  const listUrl = `${source_host.replace(/\/+$/, "")}/api/projects/${encodeURIComponent(
    source_project,
  )}/session_recordings/${encodeURIComponent(external_id)}/snapshots?blob_v2=true`;

  console.log(`🔍 [LIST] Fetching snapshot sources from: ${listUrl}`);
  const listResponse = await fetchJSON<{ sources: SnapshotSource[] }>(
    listUrl,
    authHeaders,
  );

  if (!listResponse.sources || listResponse.sources.length === 0) {
    throw new Error("No snapshot sources found (recording may be too fresh).");
  }

  // Prioritize sources: prefer blob_v2 over blob over realtime
  const v2Sources = listResponse.sources.filter(
    (s) => s.source === "blob_v2" && s.blob_key != null,
  );
  const v1Sources = listResponse.sources.filter(
    (s) => s.source === "blob" && s.blob_key != null,
  );
  const realtimeSources = listResponse.sources.filter(
    (s) => s.source === "realtime",
  );

  let sources: SnapshotSource[];
  if (v2Sources.length > 0) {
    sources = v2Sources;
    console.log(`📊 [SOURCE] Using blob_v2 with ${v2Sources.length} keys`);
  } else if (v1Sources.length > 0) {
    sources = v1Sources;
    console.log(`📊 [SOURCE] Using blob_v1 with ${v1Sources.length} sources`);
  } else if (realtimeSources.length > 0) {
    sources = realtimeSources;
    console.log(`📊 [SOURCE] Using realtime source`);
  } else {
    throw new Error("No valid sources available. Recording may be processing.");
  }

  // 2) Fetch snapshots
  const baseSnapshotsUrl = `${source_host.replace(/\/+$/, "")}/api/projects/${encodeURIComponent(
    source_project,
  )}/session_recordings/${encodeURIComponent(external_id)}/snapshots`;

  const allSnapshots: any[] = [];
  const seenHashes = new Set<string>();

  if (sources[0].source === "blob_v2") {
    // Sort blob keys numerically
    const keys = v2Sources
      .map((s) => parseInt(String(s.blob_key), 10))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    // Fetch in batches
    for (let i = 0; i < keys.length; i += MAX_V2_KEYS_PER_BATCH) {
      const batchKeys = keys.slice(i, i + MAX_V2_KEYS_PER_BATCH);
      const startKey = batchKeys[0];
      const endKey = batchKeys[batchKeys.length - 1];

      const url = `${baseSnapshotsUrl}?source=blob_v2&start_blob_key=${startKey}&end_blob_key=${endKey}`;
      console.log(
        `🔄 [FETCH] Batch ${Math.floor(i / MAX_V2_KEYS_PER_BATCH) + 1}: keys ${startKey}-${endKey}`,
      );

      // blob_v2 returns an array of NDJSON lines (strings)
      const response = await fetchJSON<string[]>(url, authHeaders);
      allSnapshots.push(...response);
    }
  } else if (sources[0].source === "blob") {
    // Fetch each blob source
    for (const source of sources) {
      const url = `${baseSnapshotsUrl}?source=blob&blob_key=${encodeURIComponent(
        String(source.blob_key),
      )}`;
      console.log(`🔄 [FETCH] Fetching blob key: ${source.blob_key}`);

      const response = await fetchJSON<any>(url, authHeaders);
      const snapshots = response.snapshots || response || [];
      allSnapshots.push(...snapshots);
    }
  } else if (sources[0].source === "realtime") {
    // Fetch realtime snapshots
    const url = `${baseSnapshotsUrl}?source=realtime`;
    console.log(`🔄 [FETCH] Fetching realtime snapshots`);

    try {
      const response = await fetchJSON<any>(url, authHeaders);
      const snapshots = response.snapshots || response || [];
      allSnapshots.push(...snapshots);
    } catch (e: any) {
      if (e.message?.includes("404")) {
        console.log(`⚠️ [FETCH] Realtime source not available (expected)`);
      } else {
        throw e;
      }
    }
  }

  console.log(`✅ [FETCH] Retrieved ${allSnapshots.length} total snapshots`);

  // Debug: Log first few snapshots to understand format
  if (allSnapshots.length > 0) {
    console.log(`🔍 [DEBUG] First snapshot structure:`, {
      type: typeof allSnapshots[0],
      isArray: Array.isArray(allSnapshots[0]),
      sample: JSON.stringify(allSnapshots[0]).slice(0, 200),
      keys:
        allSnapshots[0] && typeof allSnapshots[0] === "object"
          ? Object.keys(allSnapshots[0])
          : "N/A",
    });
  }

  // 3) Parse and process snapshots
  const parsedEvents = await parseEncodedSnapshots(allSnapshots, session_id);
  console.log(`📊 [PARSE] Parsed ${parsedEvents.length} events`);

  // 4) Deduplicate events
  const dedupedEvents: RrwebEvent[] = [];
  for (const event of parsedEvents) {
    const { delay: _delay, ...eventWithoutDelay } = event;
    const hashStr = cyrb53(JSON.stringify(eventWithoutDelay)).toString();

    if (!seenHashes.has(hashStr)) {
      seenHashes.add(hashStr);
      dedupedEvents.push(event);
    }
  }
  console.log(
    `🔍 [DEDUP] Removed ${parsedEvents.length - dedupedEvents.length} duplicate events`,
  );

  // 5) Filter out custom events (type 5) that can interfere with replay
  const filteredEvents = dedupedEvents.filter(
    (event) => event.type !== EventType.Custom,
  );
  console.log(
    `📊 [FILTER] Filtered ${dedupedEvents.length - filteredEvents.length} custom events`,
  );

  // 6) Sort events while preserving first FullSnapshot
  const sortedEvents = [...filteredEvents].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  // Find the first FullSnapshot and ensure it stays first
  const firstFullSnapshotIndex = sortedEvents.findIndex(
    (e) => e.type === EventType.FullSnapshot,
  );
  if (firstFullSnapshotIndex > 0) {
    const firstFullSnapshot = sortedEvents[firstFullSnapshotIndex];
    sortedEvents.splice(firstFullSnapshotIndex, 1);
    sortedEvents.unshift(firstFullSnapshot);
  }

  // 7) Patch missing meta events
  const patchedEvents = patchMetaEvents(sortedEvents, session_id);
  console.log(`✅ [PATCH] Final event count: ${patchedEvents.length}`);

  // 8) Add delay field for rrweb skipInactive feature
  // This is crucial for inactivity skipping to work properly
  for (let i = 0; i < patchedEvents.length; i++) {
    if (i === 0) {
      patchedEvents[i].delay = 0;
    } else {
      // Calculate milliseconds since previous event
      patchedEvents[i].delay =
        patchedEvents[i].timestamp - patchedEvents[i - 1].timestamp;
    }
  }
  console.log(`⏱️ [DELAY] Added delay field to all events for skipInactive`);

  // 9) Create segments for activity tracking
  const segments = createSegments(patchedEvents);

  // Add segments as a custom event at the beginning
  // This will be extracted by the replay player for dynamic speed adjustment
  if (segments.length > 0 && patchedEvents.length > 0) {
    const segmentEvent: RrwebEvent = {
      type: EventType.Custom, // Type 5
      timestamp: patchedEvents[0].timestamp,
      delay: 0,
      data: {
        tag: "replay-segments",
        payload: { segments },
      },
    };
    patchedEvents.unshift(segmentEvent);
    console.log(`📦 [SEGMENTS] Added segment data as custom event`);
  }

  // 10) Extract viewport dimensions from all available sources
  let maxViewportWidth = 0;
  let maxViewportHeight = 0;

  for (const event of patchedEvents) {
    // Check Meta events
    if (event.type === EventType.Meta && event.data) {
      const width = Number(event.data.width);
      const height = Number(event.data.height);
      if (Number.isFinite(width) && width > 0) {
        maxViewportWidth = Math.max(maxViewportWidth, width);
      }
      if (Number.isFinite(height) && height > 0) {
        maxViewportHeight = Math.max(maxViewportHeight, height);
      }
    }

    // Check FullSnapshot events for viewport info
    if (event.type === EventType.FullSnapshot && event.data) {
      // Try to extract from node attributes
      try {
        if (
          event.data.node?.childNodes?.[1]?.childNodes?.[1]?.childNodes?.[0]
            ?.attributes
        ) {
          const attrs =
            event.data.node.childNodes[1].childNodes[1].childNodes[0]
              .attributes;
          const width = parseInt(attrs.width, 10);
          const height = parseInt(attrs.height, 10);
          if (Number.isFinite(width) && width > 0) {
            maxViewportWidth = Math.max(maxViewportWidth, width);
          }
          if (Number.isFinite(height) && height > 0) {
            maxViewportHeight = Math.max(maxViewportHeight, height);
          }
        }
      } catch (e) {
        // Silent fail - not all snapshots have this structure
      }
    }

    // Check IncrementalSnapshot ViewportResize events
    if (
      event.type === EventType.IncrementalSnapshot &&
      event.data?.source === 4 && // ViewportResize
      event.data?.width &&
      event.data?.height
    ) {
      const width = Number(event.data.width);
      const height = Number(event.data.height);
      if (Number.isFinite(width) && width > 0) {
        maxViewportWidth = Math.max(maxViewportWidth, width);
      }
      if (Number.isFinite(height) && height > 0) {
        maxViewportHeight = Math.max(maxViewportHeight, height);
      }
    }
  }

  // Use reasonable defaults if we couldn't find viewport info
  if (maxViewportWidth === 0) {
    console.warn(
      `⚠️ [VIEWPORT] No width detected for session ${session_id}, using default: 1920`,
    );
    maxViewportWidth = 1920;
  }
  if (maxViewportHeight === 0) {
    console.warn(
      `⚠️ [VIEWPORT] No height detected for session ${session_id}, using default: 1080`,
    );
    maxViewportHeight = 1080;
  }

  console.log(
    `📱 [VIEWPORT] Device dimensions: ${maxViewportWidth}x${maxViewportHeight}`,
  );

  // 11) Write events to file
  const workDir = await mkdtemp(join(tmpdir(), "rrvideo-"));
  const jsonPath = join(workDir, `recording-${external_id}.json`);
  const eventsJson = JSON.stringify(patchedEvents);

  await fs.writeFile(jsonPath, eventsJson, "utf-8");
  console.log(`✅ [WRITE] Events saved to: ${jsonPath}`);

  // 12) Upload to Google Cloud Storage
  console.log(`☁️ [UPLOAD] Uploading events to GCS...`);
  const eventsUri = await uploadEventsToGCS({
    projectId: project_id,
    sessionId: session_id,
    eventsJson,
    eventsCount: patchedEvents.length,
  });
  console.log(`✅ [UPLOAD] Events uploaded to: ${eventsUri}`);

  return {
    eventsPath: jsonPath,
    deviceWidth: maxViewportWidth,
    deviceHeight: maxViewportHeight,
    eventsUri,
  };
}

// --------------------------------------------------------
// GCS Upload
// --------------------------------------------------------
async function uploadEventsToGCS(params: {
  projectId: string;
  sessionId: string;
  eventsJson: string;
  eventsCount: number;
}): Promise<string> {
  const { projectId, sessionId, eventsJson, eventsCount } = params;
  const fileName = `${sessionId}.json`;
  const bucketName = "ves.ai";
  const filePath = `${projectId}/${fileName}`;

  console.log(`  🗂️ Bucket: ${bucketName}`);
  console.log(`  📁 File path: ${filePath}`);
  console.log(`  📊 Events count: ${eventsCount}`);
  console.log(
    `  📏 JSON size: ${(Buffer.byteLength(eventsJson) / 1024 / 1024).toFixed(2)} MB`,
  );

  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);

  const jsonStream = Readable.from([eventsJson]);
  const writeStream = file.createWriteStream({
    metadata: {
      contentType: "application/json",
      cacheControl: "public, max-age=3600",
      metadata: {
        eventsCount: String(eventsCount),
      },
    },
    resumable: false,
    validation: false,
    gzip: true,
  });

  try {
    await pipeline(jsonStream, writeStream);
    console.log(`  ✅ Upload completed successfully`);
    return `gs://${bucketName}/${filePath}`;
  } catch (error) {
    console.error(`  ❌ [UPLOAD ERROR] Failed to upload events:`, error);
    throw error;
  }
}

// Export types
export type { RrwebEvent };
