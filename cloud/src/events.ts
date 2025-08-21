import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promises as fs } from "node:fs";
import { gunzipSync } from "node:zlib";

// Types
type EventProcessingParams = {
  source_type: "posthog";
  source_host: string;
  source_key: string;
  source_project: string;
  external_id: string;
};

type SnapshotSource = {
  source: "blob" | "blob_v2" | "realtime";
  start_timestamp: string | null;
  end_timestamp: string | null;
  blob_key: string | null;
};

type SnapshotBatchResponse = {
  snapshots?: unknown[];
  [k: string]: any;
};

type RrwebEvent = {
  type: number;
  timestamp: number;
  delay?: number; // Added for rrweb skipInactive feature
  data?: any;
  [k: string]: any;
};

const MAX_V2_KEYS_PER_CALL = 20;
const RRWEB_EVENT_META = 4;
const RRWEB_EVENT_FULLSNAPSHOT = 2;
// Event types: 0=DomContentLoaded, 1=Load, 2=FullSnapshot, 3=IncrementalSnapshot, 4=Meta, 5=Custom, 6=Plugin

// --------------------------------------------------------
// Utilities: Decompression
// --------------------------------------------------------

function decompressData(data: any): any {
  // Check if data is a string that looks like compressed data
  if (typeof data === "string" && data.length > 0) {
    // Check for gzip magic number or binary-looking content
    if (data.charCodeAt(0) === 0x1f && data.charCodeAt(1) === 0x8b) {
      try {
        // Convert string to Buffer and decompress
        const buffer = Buffer.from(data, "binary");
        const decompressed = gunzipSync(buffer);
        return JSON.parse(decompressed.toString("utf-8"));
      } catch (e) {
        console.log(`⚠️ [DECOMPRESS] Failed to decompress gzip data: ${e}`);
      }
    }

    // Also check for base64 encoded gzip
    try {
      const buffer = Buffer.from(data, "base64");
      if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
        const decompressed = gunzipSync(buffer);
        return JSON.parse(decompressed.toString("utf-8"));
      }
    } catch (e) {
      // Not base64 or not gzip, return as-is
    }
  }

  return data;
}

// --------------------------------------------------------
// Utilities: HTTP fetching
// --------------------------------------------------------

async function getJSON<T>(
  url: string,
  headers: Record<string, string>,
  tries = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `HTTP ${res.status} for ${url} :: ${text.slice(0, 500)}`,
        );
      }
      const text = await res.text();

      if (url.includes("source=blob_v2")) {
        const lines = text
          .trim()
          .split("\n")
          .filter((line) => line.trim());
        const snapshots = lines
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        return { snapshots } as T;
      }

      return JSON.parse(text) as T;
    } catch (err) {
      lastErr = err;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

// --------------------------------------------------------
// Main function: fetch and process events
// --------------------------------------------------------

export default async function constructEvents(
  params: EventProcessingParams,
): Promise<{ eventsPath: string; deviceWidth: number; deviceHeight: number }> {
  const { source_type, source_host, source_key, source_project, external_id } =
    params;

  if (source_type !== "posthog") {
    throw new Error(`Unsupported source_type: ${source_type}`);
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${source_key}`,
  };

  // 1) List sources (prefer blob_v2)
  const listUrl = `${source_host.replace(/\/+$/, "")}/api/projects/${encodeURIComponent(
    source_project,
  )}/session_recordings/${encodeURIComponent(external_id)}/snapshots?blob_v2=true`;

  console.log(`🔍 [LIST] Fetching snapshot sources from: ${listUrl}`);
  const list = await getJSON<{ sources: SnapshotSource[] }>(
    listUrl,
    authHeaders,
  );

  if (!list.sources || list.sources.length === 0) {
    throw new Error("No snapshot sources found (recording may be too fresh).");
  }

  const v2Sources = list.sources.filter(
    (s) => s.source === "blob_v2" && s.blob_key != null,
  );
  const v1Sources = list.sources.filter(
    (s) => s.source === "blob" && s.blob_key != null,
  );
  const useV2 = v2Sources.length > 0;
  console.log(
    `📊 [LIST] Found sources: v2=${v2Sources.length}, v1=${v1Sources.length}`,
  );

  const baseSnapshotsUrl = `${source_host.replace(/\/+$/, "")}/api/projects/${encodeURIComponent(
    source_project,
  )}/session_recordings/${encodeURIComponent(external_id)}/snapshots`;

  // 2) Fetch all snapshots and write to file
  const workDir = await mkdtemp(join(tmpdir(), "rrvideo-"));
  const jsonPath = join(workDir, `recording-${external_id}.json`);

  let allEvents: RrwebEvent[] = [];
  let maxViewportWidth = 0;
  let maxViewportHeight = 0;

  // Fetch snapshots
  if (useV2) {
    const keys = v2Sources
      .map((s) => parseInt(String(s.blob_key), 10))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    console.log(`📦 [FETCH] Using blob_v2 with ${keys.length} keys`);

    for (let i = 0; i < keys.length; i += MAX_V2_KEYS_PER_CALL) {
      const start = keys[i];
      const end = keys[Math.min(i + MAX_V2_KEYS_PER_CALL - 1, keys.length - 1)];
      const url = `${baseSnapshotsUrl}?source=blob_v2&start_blob_key=${start}&end_blob_key=${end}`;
      console.log(`🔄 [FETCH] Fetching batch: keys ${start}-${end}`);
      const batch = await getJSON<SnapshotBatchResponse>(url, authHeaders);

      let snaps: unknown[] = [];
      if (Array.isArray(batch)) snaps = batch;
      else if (batch && typeof batch === "object" && "snapshots" in batch)
        snaps = Array.isArray((batch as any).snapshots)
          ? (batch as any).snapshots
          : [];

      console.log(`✅ [FETCH] Got ${snaps.length} snapshots in batch`);

      // Debug: Save raw snapshots for inspection
      if (snaps.length > 0) {
        const debugPath = join(workDir, `debug-raw-${external_id}-batch.json`);
        await fs.writeFile(
          debugPath,
          JSON.stringify(snaps.slice(0, 5), null, 2),
          "utf-8",
        );
        console.log(`🔍 [DEBUG] Saved sample snapshots to: ${debugPath}`);

        // Log structure of first snapshot
        const first = snaps[0] as any;
        if (first) {
          console.log(`🔍 [DEBUG] First snapshot structure:`, {
            hasType: "type" in first,
            typeValue: first.type,
            typeType: typeof first.type,
            hasTimestamp: "timestamp" in first,
            timestampValue: first.timestamp,
            timestampType: typeof first.timestamp,
            keys: Object.keys(first).slice(0, 10),
          });
        }
      }

      // Process snapshots into events
      for (const snapshot of snaps) {
        if (snapshot && typeof snapshot === "object") {
          // Handle different snapshot formats
          let evt: any = snapshot;

          // PostHog blob_v2 format: [id, snapshot] tuple
          if (Array.isArray(snapshot) && snapshot.length === 2) {
            // Second element is the actual snapshot
            evt = snapshot[1];
          }

          // Extract event if it has type and timestamp
          if (
            evt &&
            typeof evt === "object" &&
            typeof evt.type === "number" &&
            typeof evt.timestamp === "number"
          ) {
            // Decompress data field if it's compressed (common for FullSnapshot events)
            if (evt.data && typeof evt.data === "string") {
              const decompressed = decompressData(evt.data);
              if (decompressed !== evt.data) {
                console.log(
                  `🔓 [DECOMPRESS] Decompressed event type ${evt.type} data`,
                );
                evt.data = decompressed;
              }
            }

            allEvents.push(evt as RrwebEvent);

            // Track viewport from Meta events
            if (evt.type === RRWEB_EVENT_META && evt.data) {
              const w = Number(evt.data.width);
              const h = Number(evt.data.height);
              if (Number.isFinite(w) && w > maxViewportWidth)
                maxViewportWidth = w;
              if (Number.isFinite(h) && h > maxViewportHeight)
                maxViewportHeight = h;
            }
          } else {
            // Debug why snapshot was skipped
            if (allEvents.length === 0 && snaps.indexOf(snapshot) < 5) {
              console.log(`⚠️ [DEBUG] Skipped snapshot:`, {
                isArray: Array.isArray(snapshot),
                arrayLength: Array.isArray(snapshot) ? snapshot.length : "N/A",
                hasType: evt && "type" in evt,
                typeValue: evt?.type,
                typeType: typeof evt?.type,
                hasTimestamp: evt && "timestamp" in evt,
                timestampValue: evt?.timestamp,
                timestampType: typeof evt?.timestamp,
              });
            }
          }
        }
      }
    }
  } else if (v1Sources.length > 0) {
    console.log(`📦 [FETCH] Using blob_v1 with ${v1Sources.length} sources`);
    for (const s of v1Sources) {
      const url = `${baseSnapshotsUrl}?source=blob&blob_key=${encodeURIComponent(String(s.blob_key))}`;
      console.log(`🔄 [FETCH] Fetching blob_v1 key: ${s.blob_key}`);
      const batch = await getJSON<SnapshotBatchResponse>(url, authHeaders);

      let snaps: unknown[] = [];
      if (Array.isArray(batch)) snaps = batch;
      else if (batch && typeof batch === "object" && "snapshots" in batch)
        snaps = Array.isArray((batch as any).snapshots)
          ? (batch as any).snapshots
          : [];

      console.log(`✅ [FETCH] Got ${snaps.length} snapshots in batch`);

      // Debug: Save raw snapshots for inspection
      if (snaps.length > 0) {
        const debugPath = join(workDir, `debug-raw-${external_id}-batch.json`);
        await fs.writeFile(
          debugPath,
          JSON.stringify(snaps.slice(0, 5), null, 2),
          "utf-8",
        );
        console.log(`🔍 [DEBUG] Saved sample snapshots to: ${debugPath}`);

        // Log structure of first snapshot
        const first = snaps[0] as any;
        if (first) {
          console.log(`🔍 [DEBUG] First snapshot structure:`, {
            hasType: "type" in first,
            typeValue: first.type,
            typeType: typeof first.type,
            hasTimestamp: "timestamp" in first,
            timestampValue: first.timestamp,
            timestampType: typeof first.timestamp,
            keys: Object.keys(first).slice(0, 10),
          });
        }
      }

      // Process snapshots into events
      for (const snapshot of snaps) {
        if (snapshot && typeof snapshot === "object") {
          // Handle different snapshot formats
          let evt: any = snapshot;

          // PostHog blob_v2 format: [id, snapshot] tuple
          if (Array.isArray(snapshot) && snapshot.length === 2) {
            // Second element is the actual snapshot
            evt = snapshot[1];
          }

          // Extract event if it has type and timestamp
          if (
            evt &&
            typeof evt === "object" &&
            typeof evt.type === "number" &&
            typeof evt.timestamp === "number"
          ) {
            // Decompress data field if it's compressed (common for FullSnapshot events)
            if (evt.data && typeof evt.data === "string") {
              const decompressed = decompressData(evt.data);
              if (decompressed !== evt.data) {
                console.log(
                  `🔓 [DECOMPRESS] Decompressed event type ${evt.type} data`,
                );
                evt.data = decompressed;
              }
            }

            allEvents.push(evt as RrwebEvent);

            // Track viewport from Meta events
            if (evt.type === RRWEB_EVENT_META && evt.data) {
              const w = Number(evt.data.width);
              const h = Number(evt.data.height);
              if (Number.isFinite(w) && w > maxViewportWidth)
                maxViewportWidth = w;
              if (Number.isFinite(h) && h > maxViewportHeight)
                maxViewportHeight = h;
            }
          } else {
            // Debug why snapshot was skipped
            if (allEvents.length === 0 && snaps.indexOf(snapshot) < 5) {
              console.log(`⚠️ [DEBUG] Skipped snapshot:`, {
                isArray: Array.isArray(snapshot),
                arrayLength: Array.isArray(snapshot) ? snapshot.length : "N/A",
                hasType: evt && "type" in evt,
                typeValue: evt?.type,
                typeType: typeof evt?.type,
                hasTimestamp: evt && "timestamp" in evt,
                timestampValue: evt?.timestamp,
                timestampType: typeof evt?.timestamp,
              });
            }
          }
        }
      }
    }
  } else {
    throw new Error(
      "Only realtime source available; recording is likely very recent. Try again later when blobs are available (ideally ≥24h old).",
    );
  }

  // Filter out custom events (type 5) as they can interfere with skipInactive
  // Standard rrweb event types are 0-4, 6 (DomContentLoaded, Load, Meta, FullSnapshot, IncrementalSnapshot, Plugin)
  const filteredEvents = allEvents.filter((event) => {
    if (event.type === 5) {
      return false;
    }
    return true;
  });

  console.log(
    `📊 [EVENTS] Filtered ${allEvents.length - filteredEvents.length} custom events, ${filteredEvents.length} events remaining`,
  );
  allEvents = filteredEvents;

  // Sort events by timestamp
  allEvents.sort((a, b) => {
    // Ensure FullSnapshot (type 2) comes first
    if (a.type === 2 && b.type !== 2) return -1;
    if (a.type !== 2 && b.type === 2) return 1;
    return a.timestamp - b.timestamp;
  });

  // Write events to file
  console.log(`📊 [WRITE] Writing ${allEvents.length} events to file...`);
  await fs.writeFile(jsonPath, JSON.stringify(allEvents), "utf-8");

  if (allEvents.length === 0) {
    throw new Error("No rrweb events were parsed from the snapshots.");
  }

  console.log(`✅ [EVENTS] Events saved to: ${jsonPath}`);
  console.log(
    `📱 [EVENTS] Device dimensions: ${maxViewportWidth}x${maxViewportHeight}`,
  );

  return {
    eventsPath: jsonPath,
    deviceWidth: maxViewportWidth,
    deviceHeight: maxViewportHeight,
  };
}

// Export types for use in other modules
export type { RrwebEvent };
