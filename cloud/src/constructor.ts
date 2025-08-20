import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve as pathResolve } from "node:path";
import { createWriteStream, promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { decompressFromBase64 } from "lz-string";
import { LaunchOptions } from "playwright-core";
import { createRequire } from "node:module";

type RrvideoConfig = {
  width?: number;
  height?: number;
  speed?: number;
  skipInactive?: boolean;
  mouseTail?: {
    strokeStyle?: string;
    lineWidth?: number;
    duration?: number;
  };
};

type Params = {
  source_type: "posthog";
  source_host: string;
  source_key: string;
  source_project: string;
  recording_id: string;
  active_duration: number;
  rrvideo_config?: RrvideoConfig;
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
  data?: any;
  [k: string]: any;
};

const MAX_V2_KEYS_PER_CALL = 20;
// rrweb EventType.Meta = 4
const RRWEB_EVENT_META = 4;

// --------------------------------------------------------
// Utilities: HTTP + rrweb event parsing
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

function* toRrwebEventsGenerator(rawChunk: unknown): Generator<RrwebEvent> {
  const processEvent = function* (maybe: unknown): Generator<RrwebEvent> {
    if (!maybe) return;

    if (typeof maybe === "string") {
      try {
        const d = decompressFromBase64(maybe);
        if (d) {
          const parsed = JSON.parse(d);
          if (Array.isArray(parsed)) {
            for (const item of parsed) yield* processEvent(item);
          } else {
            yield* processEvent(parsed);
          }
          return;
        }
      } catch {}
      try {
        const parsed = JSON.parse(maybe);
        yield* processEvent(parsed);
        return;
      } catch {}
    }

    if (typeof maybe === "object" && maybe !== null) {
      const evt = maybe as Partial<RrwebEvent>;
      if (typeof evt.type === "number" && typeof evt.timestamp === "number") {
        // Check if the entire data field is compressed (common for FullSnapshot events)
        if (evt.data && typeof evt.data === "string") {
          const dataStr = evt.data as string;

          // First, check if it might be gzipped (starts with \x1f\x8b or \x1f\x08)
          if (
            dataStr.charCodeAt(0) === 0x1f &&
            (dataStr.charCodeAt(1) === 0x8b || dataStr.charCodeAt(1) === 0x08)
          ) {
            console.log(
              `🔍 [DECOMPRESS] Event type ${evt.type} data appears to be gzipped`,
            );
            try {
              // Convert string to Buffer for gunzip
              const buffer = Buffer.from(dataStr, "binary");
              const decompressed = gunzipSync(buffer);
              const jsonStr = decompressed.toString("utf-8");
              evt.data = JSON.parse(jsonStr);
              console.log(
                `✅ [DECOMPRESS] Successfully decompressed gzipped event type ${evt.type}`,
              );
            } catch (err) {
              console.error(
                `❌ [DECOMPRESS] Failed to gunzip event type ${evt.type}:`,
                err,
              );
            }
          } else {
            // Try lz-string decompression
            try {
              const decompressed = decompressFromBase64(evt.data);
              if (decompressed) {
                evt.data = JSON.parse(decompressed);
                console.log(
                  `✅ [DECOMPRESS] Decompressed event type ${evt.type} data with lz-string`,
                );
              } else {
                console.warn(
                  `⚠️ [DECOMPRESS] Failed to decompress event type ${evt.type} data with lz-string`,
                );
                // Maybe it's already JSON?
                try {
                  evt.data = JSON.parse(dataStr);
                  console.log(
                    `✅ [DECOMPRESS] Event type ${evt.type} data was already JSON`,
                  );
                } catch {
                  console.warn(
                    `⚠️ [DECOMPRESS] Event type ${evt.type} data is neither lz-string nor JSON`,
                  );
                }
              }
            } catch (err) {
              console.error(
                `❌ [DECOMPRESS] Error decompressing event type ${evt.type}:`,
                err,
              );
            }
          }
        }

        // Check if the event data contains compressed fields
        if (evt.data && typeof evt.data === "object") {
          const data = evt.data as any;

          // For FullSnapshot events (type 2), check if node data is compressed
          if (evt.type === 2) {
            if (data.node && typeof data.node === "string") {
              try {
                const decompressed = decompressFromBase64(data.node);
                if (decompressed) {
                  data.node = JSON.parse(decompressed);
                }
              } catch {}
            }

            // Ensure node structure is valid
            if (data.node) {
              function ensureNodeType(node: any) {
                if (node && typeof node === "object") {
                  // If type is missing, try to infer it
                  if (typeof node.type === "undefined") {
                    if (node.tagName) {
                      node.type = 2; // Element node
                    } else if (node.textContent !== undefined) {
                      node.type = 3; // Text node
                    } else if (node.name === "document") {
                      node.type = 0; // Document node
                    } else {
                      node.type = 1; // Document type node (fallback)
                    }
                  }

                  // Recursively fix childNodes
                  if (node.childNodes && Array.isArray(node.childNodes)) {
                    node.childNodes = node.childNodes.filter(
                      (child: any) => child !== null && child !== undefined,
                    );
                    node.childNodes.forEach(ensureNodeType);
                  }
                }
              }
              ensureNodeType(data.node);
            }
          }

          // Check for compressed mutation data (for IncrementalSnapshot events)
          if (data.adds && typeof data.adds === "string") {
            try {
              const decompressed = decompressFromBase64(data.adds);
              if (decompressed) {
                data.adds = JSON.parse(decompressed);
              }
            } catch {}
          }

          if (data.removes && typeof data.removes === "string") {
            try {
              const decompressed = decompressFromBase64(data.removes);
              if (decompressed) {
                data.removes = JSON.parse(decompressed);
              }
            } catch {}
          }

          if (data.attributes && typeof data.attributes === "string") {
            try {
              const decompressed = decompressFromBase64(data.attributes);
              if (decompressed) {
                data.attributes = JSON.parse(decompressed);
              }
            } catch {}
          }

          if (data.texts && typeof data.texts === "string") {
            try {
              const decompressed = decompressFromBase64(data.texts);
              if (decompressed) {
                data.texts = JSON.parse(decompressed);
              }
            } catch {}
          }

          // Ensure removes is always an array (fix for forEach error)
          if (data.removes && !Array.isArray(data.removes)) {
            data.removes = [];
          }

          // Ensure other mutation arrays exist
          if (data.adds && !Array.isArray(data.adds)) {
            data.adds = [];
          }
          if (data.attributes && !Array.isArray(data.attributes)) {
            data.attributes = [];
          }
          if (data.texts && !Array.isArray(data.texts)) {
            data.texts = [];
          }
        }

        yield evt as RrwebEvent;
        return;
      }
      const anyObj = maybe as any;
      if (Array.isArray(anyObj.data)) {
        for (const item of anyObj.data) yield* processEvent(item);
        return;
      }
      if (Array.isArray(maybe)) {
        const arr = maybe as any[];
        if (arr.length >= 2) {
          yield* processEvent(arr[1]);
          return;
        }
      }
    }

    if (Array.isArray(maybe)) {
      for (const item of maybe) yield* processEvent(item);
    }
  };

  yield* processEvent(rawChunk);
}

// --------------------------------------------------------
// Inline "rrvideo" replacement using Playwright directly
// --------------------------------------------------------

const requireFromHere = createRequire(__filename);
async function readRrwebPlayerAssets() {
  // Resolve rrweb-player - the main entry points to lib/index.js
  const rrwebPlayerPkgMain = requireFromHere.resolve("rrweb-player");
  // We need the UMD build which is in dist/index.js, and CSS in dist/style.css
  const rrwebUmdPath = pathResolve(rrwebPlayerPkgMain, "../../dist/index.js");
  const rrwebCssPath = pathResolve(rrwebUmdPath, "../style.css");
  const rrwebRaw = await fs.readFile(rrwebUmdPath, "utf-8");
  const rrwebStyle = await fs.readFile(rrwebCssPath, "utf-8");
  return {
    script: rrwebRaw,
    css: rrwebStyle,
  };
}

function buildReplayHtml(
  eventsJson: string,
  assets: { script: string; css: string },
  opts: {
    width: number;
    height: number;
    speed: number;
    skipInactive: boolean;
    inactiveThreshold?: number;
    mouseTail?: { strokeStyle?: string; lineWidth?: number; duration?: number };
  },
): string {
  const safeEvents = eventsJson.replace(/<\/script>/g, "<\\/script>");
  // We set a transform scale to record at higher resolution.
  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${assets.css}</style>
    <style>
      html, body { 
        margin: 0; 
        padding: 0; 
        background: #fff;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      .replayer-wrapper { 
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <script>
      ${assets.script}
      /*<!--*/
      const __events = ${safeEvents};
      const __config = {
        width: ${opts.width},
        height: ${opts.height},
        speed: ${opts.speed},
        skipInactive: true,
        inactiveThreshold: ${opts.inactiveThreshold || 10000},
        mouseTail: ${JSON.stringify(opts.mouseTail || {})},
        showController: false,
        autoPlay: true
      };
      /*-->*/

      // rrweb-player globals:
      // The dist/index.js defines window.rrwebPlayer as the constructor directly
      console.log('Initializing player with skipInactive:', __config.skipInactive, 'threshold:', __config.inactiveThreshold);
      window.replayer = new rrwebPlayer({
        target: document.body,
        width: __config.width,
        height: __config.height,
        props: {
          ...__config,
          events: __events
        }
      });

      // Track start time
      window.__startTime = Date.now();
      console.log('Starting replay with', __events.length, 'events');

      // Ensure we actually start
      if (window.replayer && typeof window.replayer.play === 'function') {
        try { 
          window.replayer.play(); 
          console.log('Replay started successfully');
        } catch(e) {
          console.error('Failed to start replay:', e);
        }
      }

      // Notify host on progress and finish
      // Add error handler for rrweb-player
      window.addEventListener('error', (e) => {
        console.error('[ERROR]', e.message, 'at', e.filename, ':', e.lineno, ':', e.colno);
        if (e.error && e.error.stack) {
          console.error('[STACK]', e.error.stack);
        }
      });
      
      // Log first few events for debugging
      if (__events && __events.length > 0) {
        console.log('First event:', JSON.stringify(__events[0]).substring(0, 500));
        console.log('Event types in first 10:', __events.slice(0, 10).map(e => e ? e.type : 'undefined'));
        
        // Check for FullSnapshot events
        const fullSnapshots = __events.filter(e => e && e.type === 2);
        console.log('Found', fullSnapshots.length, 'FullSnapshot events');
        if (fullSnapshots.length > 0) {
          const fs = fullSnapshots[0];
          console.log('First FullSnapshot has data?', !!fs.data);
          if (fs.data) {
            console.log('FullSnapshot data.node exists?', !!fs.data.node);
            console.log('FullSnapshot data.node.type?', fs.data.node ? fs.data.node.type : 'undefined');
            
            // Recursive function to find nodes without type
            function findNodesWithoutType(node, path = 'root') {
              const issues = [];
              if (!node) {
                issues.push(path + ' is null/undefined');
              } else if (typeof node.type === 'undefined') {
                issues.push(path + ' missing type property');
              }
              if (node && node.childNodes && Array.isArray(node.childNodes)) {
                node.childNodes.forEach((child, i) => {
                  if (child === null || child === undefined) {
                    issues.push(path + '.childNodes[' + i + '] is null/undefined');
                  } else {
                    issues.push(...findNodesWithoutType(child, path + '.childNodes[' + i + ']'));
                  }
                });
              }
              return issues;
            }
            
            const issues = findNodesWithoutType(fs.data.node);
            if (issues.length > 0) {
              console.warn('FullSnapshot has', issues.length, 'nodes with issues:');
              issues.slice(0, 5).forEach(issue => console.warn('  -', issue));
            } else {
              console.log('FullSnapshot structure looks valid');
            }
          }
        }
        
        // Check for any undefined events
        const undefinedEvents = __events.filter(e => !e || e.type === undefined);
        if (undefinedEvents.length > 0) {
          console.warn('Found', undefinedEvents.length, 'undefined or invalid events');
        }
      }
      
      window.__lastProgressTime = Date.now();
      window.__lastProgressPercent = 0;
      window.replayer.addEventListener('ui-update-progress', (payload) => {
        try { 
          const elapsed = (Date.now() - window.__startTime) / 1000;
          if (payload && typeof payload.payload === 'number') {
            const percent = Math.round(payload.payload * 100);
            const timeSinceLastProgress = Date.now() - window.__lastProgressTime;
            
            // Log progress with timing info
            console.log('Progress:', percent + '%', 'at', elapsed.toFixed(1) + 's', 
                       '(+' + (timeSinceLastProgress/1000).toFixed(1) + 's since last update)');
            
            window.__lastProgressTime = Date.now();
            window.__lastProgressPercent = percent;
            
            // Warn if progress is stuck
            if (timeSinceLastProgress > 30000 && percent < 100) {
              console.warn('Progress appears stuck at', percent + '%');
            }
          }
          window.onReplayProgressUpdate && window.onReplayProgressUpdate(payload); 
        } catch(e) {}
      });
      window.replayer.addEventListener('finish', () => {
        const elapsed = (Date.now() - window.__startTime) / 1000;
        console.log('Replay finished after', elapsed.toFixed(1) + 's');
        try { window.onReplayFinish && window.onReplayFinish(); } catch(e) {}
      });
    </script>
  </body>
</html>`;
}

async function moveFile(src: string, dest: string) {
  try {
    await fs.rename(src, dest);
  } catch {
    // cross-device fallback
    const rs = createWriteStream(dest);
    await fs.copyFile(src, dest);
    rs.close();
    await fs.unlink(src);
  }
}

// --------------------------------------------------------
// Main entry: fetch PostHog event blobs -> render via Playwright -> return WEBM
// --------------------------------------------------------

export async function constructWebm(params: Params): Promise<{
  videoPath: string;
  videoDuration: number;
}> {
  const {
    source_type,
    source_host,
    source_key,
    source_project,
    recording_id,
    rrvideo_config = {},
  } = params;

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
  )}/session_recordings/${encodeURIComponent(recording_id)}/snapshots?blob_v2=true`;

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
  )}/session_recordings/${encodeURIComponent(recording_id)}/snapshots`;

  // 2) Stream snapshots -> JSON events file (w/ dedupe), track meta viewport + timestamps
  async function* fetchSnapshots(): AsyncGenerator<unknown[]> {
    if (useV2) {
      const keys = v2Sources
        .map((s) => parseInt(String(s.blob_key), 10))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);
      console.log(`📦 [FETCH] Using blob_v2 with ${keys.length} keys`);

      for (let i = 0; i < keys.length; i += MAX_V2_KEYS_PER_CALL) {
        const start = keys[i];
        const end =
          keys[Math.min(i + MAX_V2_KEYS_PER_CALL - 1, keys.length - 1)];
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
        if (snaps.length > 0) yield snaps;
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
        if (snaps.length > 0) yield snaps;
      }
    } else {
      throw new Error(
        "Only realtime source available; recording is likely very recent. Try again later when blobs are available (ideally ≥24h old).",
      );
    }
  }

  const workDir = await mkdtemp(join(tmpdir(), "rrvideo-"));
  const outPath = join(workDir, `recording-${recording_id}.webm`);
  const jsonPath = join(workDir, `recording-${recording_id}.json`);

  // Also save a copy for debugging in src folder
  const debugJsonPath = join(__dirname, `debug-${recording_id}.json`);

  console.log(`📊 [STREAM] Starting to stream events to file...`);
  let eventCount = 0;
  let firstTimestamp = 0;
  let lastTimestamp = 0;
  let maxViewportWidth = 0;
  let maxViewportHeight = 0;

  const writeStream = createWriteStream(jsonPath);
  const debugStream = createWriteStream(debugJsonPath);

  await new Promise<void>((resolve, reject) => {
    writeStream.on("error", reject);
    writeStream.on("finish", () => {
      debugStream.end();
      resolve();
    });

    (async () => {
      try {
        // Collect all events first to sort them
        const allEvents: RrwebEvent[] = [];

        for await (const snapshots of fetchSnapshots()) {
          for (const snapshot of snapshots) {
            for (const event of toRrwebEventsGenerator(snapshot)) {
              // Validate event structure
              if (
                !event ||
                typeof event.type !== "number" ||
                typeof event.timestamp !== "number"
              ) {
                console.warn(
                  `⚠️ [STREAM] Skipping invalid event: missing type or timestamp`,
                );
                continue;
              }

              // IMPORTANT: The event from toRrwebEventsGenerator should already have
              // decompressed data, but let's double-check for FullSnapshot events
              if (
                event.type === 2 &&
                event.data &&
                typeof event.data === "string"
              ) {
                console.warn(
                  `⚠️ [STREAM] FullSnapshot event still has compressed data after toRrwebEventsGenerator!`,
                );
                // This shouldn't happen if toRrwebEventsGenerator is working correctly
                // Try to decompress it here as a fallback
                const dataStr = event.data as string;
                if (
                  dataStr.charCodeAt(0) === 0x1f &&
                  (dataStr.charCodeAt(1) === 0x8b ||
                    dataStr.charCodeAt(1) === 0x08)
                ) {
                  try {
                    const buffer = Buffer.from(dataStr, "binary");
                    const decompressed = gunzipSync(buffer);
                    event.data = JSON.parse(decompressed.toString("utf-8"));
                    console.log(
                      `✅ [STREAM] Successfully decompressed gzipped FullSnapshot as fallback`,
                    );
                  } catch (err) {
                    console.error(
                      `❌ [STREAM] Failed to gunzip FullSnapshot:`,
                      err,
                    );
                  }
                } else {
                  try {
                    const decompressed = decompressFromBase64(
                      event.data as string,
                    );
                    if (decompressed) {
                      event.data = JSON.parse(decompressed);
                      console.log(
                        `✅ [STREAM] Successfully decompressed FullSnapshot data as fallback`,
                      );
                    }
                  } catch (err) {
                    console.error(
                      `❌ [STREAM] Failed to decompress FullSnapshot:`,
                      err,
                    );
                  }
                }
              }

              allEvents.push(event);

              if (allEvents.length % 1000 === 0) {
                console.log(
                  `📊 [STREAM] Collected ${allEvents.length} events...`,
                );
              }
            }
          }
        }

        // Sort events by timestamp, but ensure FullSnapshot (type 2) comes first
        console.log(
          `🔄 [STREAM] Sorting ${allEvents.length} events by timestamp...`,
        );
        allEvents.sort((a, b) => {
          // FullSnapshot (type 2) should always come first
          if (a.type === 2 && b.type !== 2) return -1;
          if (a.type !== 2 && b.type === 2) return 1;
          // Otherwise sort by timestamp
          return a.timestamp - b.timestamp;
        });

        // Log event type distribution for debugging
        const eventTypeCounts = new Map<number, number>();
        allEvents.forEach((e) => {
          eventTypeCounts.set(e.type, (eventTypeCounts.get(e.type) || 0) + 1);
        });
        console.log(
          `📊 [STREAM] Event types: ${Array.from(eventTypeCounts.entries())
            .map(([type, count]) => `Type ${type}: ${count}`)
            .join(", ")}`,
        );

        // Write sorted events to both files
        writeStream.write("[");
        debugStream.write("[");
        let isFirst = true;

        for (const event of allEvents) {
          // Track timing and viewport
          if (eventCount === 0) firstTimestamp = event.timestamp;
          lastTimestamp = event.timestamp;
          eventCount++;

          // Track max viewport from Meta events
          if (event.type === RRWEB_EVENT_META && event.data) {
            const w = Number(event.data.width);
            const h = Number(event.data.height);
            if (Number.isFinite(w) && w > maxViewportWidth)
              maxViewportWidth = w;
            if (Number.isFinite(h) && h > maxViewportHeight)
              maxViewportHeight = h;
          }

          const eventJson = JSON.stringify(event);
          if (!isFirst) {
            writeStream.write(",");
            debugStream.write(",\n");
          }
          writeStream.write(eventJson);
          debugStream.write(eventJson);
          isFirst = false;
        }

        writeStream.write("]");
        debugStream.write("]");
        writeStream.end();

        console.log(
          `📊 [STREAM] Finished writing ${eventCount} events to file`,
        );
        console.log(`📊 [DEBUG] Saved debug JSON to: ${debugJsonPath}`);

        // Also save first few events for inspection (with decompressed data)
        if (allEvents.length > 0) {
          const samplePath = join(
            __dirname,
            `debug-sample-${recording_id}.json`,
          );

          // Create a copy with decompressed data for debugging
          const debugEvents = allEvents.slice(0, 10).map((event) => {
            const copy = { ...event };
            // If data is a compressed string, show first 100 chars
            if (copy.data && typeof copy.data === "string") {
              copy.data = `[COMPRESSED STRING: ${copy.data.substring(0, 100)}...]`;
            }
            return copy;
          });

          await fs.writeFile(
            samplePath,
            JSON.stringify(debugEvents, null, 2),
            "utf-8",
          );
          console.log(`📊 [DEBUG] Saved first 10 events to: ${samplePath}`);

          // Log info about first FullSnapshot
          const firstFullSnapshot = allEvents.find((e) => e.type === 2);
          if (firstFullSnapshot) {
            console.log(
              `📊 [DEBUG] First FullSnapshot data type: ${typeof firstFullSnapshot.data}`,
            );
            if (
              typeof firstFullSnapshot.data === "object" &&
              firstFullSnapshot.data
            ) {
              const data = firstFullSnapshot.data as any;
              console.log(
                `📊 [DEBUG] FullSnapshot has node: ${!!data.node}, node type: ${data.node ? typeof data.node : "N/A"}`,
              );
            }
          }
        }
      } catch (err) {
        console.error(`❌ [STREAM] Error streaming events:`, err);
        writeStream.destroy();
        debugStream.destroy();
        reject(err);
      }
    })();
  });

  if (eventCount === 0) {
    throw new Error("No rrweb events were parsed from the snapshots.");
  }

  // 3) Render via Playwright (in-house rrvideo)
  console.log(`🎬 [RENDER] Rendering with Playwright (no rrvideo)…`);

  // Compress idle periods in events for accurate replay timing
  const allEvents = JSON.parse(await fs.readFile(jsonPath, "utf-8"));
  if (allEvents.length > 0) {
    console.log(
      `🔄 [RENDER] Processing ${allEvents.length} events for idle period compression...`,
    );

    // Identify idle periods from PostHog markers
    const idlePeriods: Array<{ start: number; end: number; reason: string }> =
      [];

    for (let i = 0; i < allEvents.length; i++) {
      const event = allEvents[i];

      // Detect start of idle period
      if (event.type === 5 && event.data?.tag === "sessionIdle") {
        // Find the end of this idle period (sessionNoLongerIdle or next user activity)
        let endTime = null;
        let reason = "session timeout";

        for (let j = i + 1; j < allEvents.length; j++) {
          const nextEvent = allEvents[j];

          // End on sessionNoLongerIdle
          if (
            nextEvent.type === 5 &&
            nextEvent.data?.tag === "sessionNoLongerIdle"
          ) {
            endTime = nextEvent.timestamp;
            reason = "user returned";
            break;
          }

          // Or end on actual user activity (mouse, click, input)
          if (
            nextEvent.type === 3 &&
            [1, 2, 3, 5].includes(nextEvent.data?.source)
          ) {
            endTime = nextEvent.timestamp;
            reason = "user activity";
            break;
          }
        }

        // If no end found, it's idle until the end
        if (!endTime && i < allEvents.length - 1) {
          endTime = allEvents[allEvents.length - 1].timestamp;
          reason = "recording ended";
        }

        if (endTime && endTime > event.timestamp) {
          idlePeriods.push({
            start: event.timestamp,
            end: endTime,
            reason,
          });
        }
      }

      // Also detect window hidden periods
      if (event.type === 5 && event.data?.tag === "window hidden") {
        // Find when window becomes visible or activity resumes
        let endTime = null;

        for (let j = i + 1; j < allEvents.length; j++) {
          const nextEvent = allEvents[j];

          // End on window visible or actual user activity
          if (
            (nextEvent.type === 5 &&
              nextEvent.data?.tag === "window visible") ||
            (nextEvent.type === 3 &&
              [1, 2, 3, 5].includes(nextEvent.data?.source))
          ) {
            endTime = nextEvent.timestamp;
            break;
          }
        }

        // If no activity after window hidden, idle until end
        if (!endTime && i < allEvents.length - 1) {
          endTime = allEvents[allEvents.length - 1].timestamp;
        }

        if (endTime && endTime > event.timestamp + 10000) {
          // Only if > 10s
          idlePeriods.push({
            start: event.timestamp,
            end: endTime,
            reason: "window hidden",
          });
        }
      }
    }

    // Merge overlapping periods
    idlePeriods.sort((a, b) => a.start - b.start);
    const mergedPeriods: typeof idlePeriods = [];

    for (const period of idlePeriods) {
      if (mergedPeriods.length === 0) {
        mergedPeriods.push(period);
      } else {
        const last = mergedPeriods[mergedPeriods.length - 1];
        if (period.start <= last.end) {
          // Merge overlapping periods
          last.end = Math.max(last.end, period.end);
          last.reason = `${last.reason} + ${period.reason}`;
        } else {
          mergedPeriods.push(period);
        }
      }
    }

    console.log(
      `🕐 [RENDER] Found ${mergedPeriods.length} idle period(s) to compress:`,
    );
    let totalIdleTime = 0;
    for (const period of mergedPeriods) {
      const duration = (period.end - period.start) / 1000;
      totalIdleTime += duration;
      console.log(`   - ${duration.toFixed(1)}s idle (${period.reason})`);
    }

    // Now compress timestamps
    if (mergedPeriods.length > 0) {
      const COMPRESSED_GAP = 1000; // Replace idle periods with 1 second gap

      for (const period of mergedPeriods) {
        const idleDuration = period.end - period.start;
        const compressionAmount = idleDuration - COMPRESSED_GAP;

        // Adjust all timestamps after this idle period
        for (let i = 0; i < allEvents.length; i++) {
          if (allEvents[i].timestamp > period.end) {
            allEvents[i].timestamp -= compressionAmount;

            // Also adjust nested timestamps in data if they exist
            if (allEvents[i].data) {
              adjustNestedTimestamps(allEvents[i].data, compressionAmount);
            }
          }
        }

        // Update the end times of subsequent periods
        for (const nextPeriod of mergedPeriods) {
          if (nextPeriod.start > period.end) {
            nextPeriod.start -= compressionAmount;
            nextPeriod.end -= compressionAmount;
          }
        }
      }

      // Save compressed events back to file
      await fs.writeFile(jsonPath, JSON.stringify(allEvents), "utf-8");

      const newDuration =
        (allEvents[allEvents.length - 1].timestamp - allEvents[0].timestamp) /
        1000;
      console.log(
        `✅ [RENDER] Compressed ${totalIdleTime.toFixed(1)}s of idle time`,
      );
      console.log(
        `   Original duration: ${((allEvents[allEvents.length - 1].timestamp - allEvents[0].timestamp) / 1000 + totalIdleTime).toFixed(1)}s`,
      );
      console.log(`   Compressed duration: ${newDuration.toFixed(1)}s`);
      console.log(`   Active time saved: ${totalIdleTime.toFixed(1)}s`);
    }
  }

  // Helper function to adjust nested timestamps
  function adjustNestedTimestamps(obj: any, amount: number): void {
    if (!obj || typeof obj !== "object") return;

    // Known timestamp fields in rrweb events
    const timestampFields = ["timestamp", "timeOffset", "delay"];

    for (const key in obj) {
      if (timestampFields.includes(key) && typeof obj[key] === "number") {
        obj[key] -= amount;
      } else if (typeof obj[key] === "object") {
        adjustNestedTimestamps(obj[key], amount);
      }
    }
  }

  // Defaults
  const baseWidth =
    rrvideo_config.width || Math.max(1, maxViewportWidth || 1400);
  const baseHeight =
    rrvideo_config.height || Math.max(1, maxViewportHeight || 900);
  const speed = rrvideo_config.speed ?? 1;
  // Force skipInactive and set a reasonable inactive threshold
  const skipInactive = true; // Always skip inactive periods
  const inactiveThreshold = 10000; // 10 seconds of inactivity triggers skip
  const mouseTail = rrvideo_config.mouseTail;

  // Don't scale the actual render dimensions - keep them at base size
  // The browser recording will capture at the viewport size
  const renderWidth = baseWidth;
  const renderHeight = baseHeight;

  // Read events as a string once (same as rrvideo)
  const eventsJson = await fs.readFile(jsonPath, "utf-8");
  const assets = await readRrwebPlayerAssets();
  const html = buildReplayHtml(eventsJson, assets, {
    width: baseWidth,
    height: baseHeight,
    speed,
    skipInactive,
    inactiveThreshold,
    mouseTail,
  });

  // Launch chromium with optimized memory settings
  // Use @sparticuz/chromium for Linux environments (production/Docker)
  // Use system chromium for local development (macOS/Windows)
  const isLinux = process.platform === "linux";

  // Dynamically import the right Playwright package
  // playwright-core for production (we provide our own browser via Sparticuz)
  // playwright for local dev (includes browsers)
  const { chromium: playwrightChromium } = await import(
    isLinux ? "playwright-core" : "playwright"
  );

  // Set Sparticuz chromium settings for serverless environments
  let chromiumPath: string | undefined = undefined;

  const launchOptions: LaunchOptions = {
    headless: true,
    executablePath: chromiumPath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-blink-features=AutomationControlled",
      "--disable-accelerated-2d-canvas",
      "--disable-webgl",
      "--disable-webgl2",
      "--memory-pressure-off",
      "--max_old_space_size=512", // Limit V8 heap per context
      "--single-process", // Important for serverless
      "--disable-dev-tools",
    ],
    timeout: 30000,
  };
  console.log(
    `🚀 [BROWSER] Launching browser with timeout: ${launchOptions.timeout}ms`,
  );
  const browser = await playwrightChromium.launch(launchOptions);
  console.log(`✅ [BROWSER] Browser launched successfully`);
  const context = await browser.newContext({
    viewport: { width: renderWidth, height: renderHeight },
    recordVideo: {
      dir: workDir,
      size: { width: renderWidth, height: renderHeight },
    },
  });
  const page = await context.newPage();

  let lastProgressPercent = -1;

  // Capture console messages from the browser with better deduplication
  page.on("console", (msg: any) => {
    const type = msg.type();
    const text = msg.text();

    // Special handling for progress messages
    if (text.includes("Progress:")) {
      const percentMatch = text.match(/Progress:\s*(\d+)%/);
      if (percentMatch) {
        const percent = parseInt(percentMatch[1]);
        // Only log if progress changed by at least 5%
        if (Math.abs(percent - lastProgressPercent) >= 5) {
          lastProgressPercent = percent;
          console.log(`⏯️ [REPLAY] ${percent}%`);
        }
      }
      return; // Don't log the raw progress message
    }

    // For errors, always log with full details
    if (type === "error") {
      console.error(`🌐 [BROWSER ERROR] ${text}`);
      // Try to get more info from the error
      msg.args().forEach(async (arg: any) => {
        try {
          const value = await arg.jsonValue();
          if (value && typeof value === "object" && value.stack) {
            console.error(`  Stack trace:`, value.stack);
          }
        } catch (e) {
          // Ignore errors getting arg values
        }
      });
      return;
    }

    // For other messages, only log if important
    if (
      text.includes("finished") ||
      text.includes("started") ||
      text.includes("Starting replay") ||
      text.includes("Found") ||
      text.includes("First")
    ) {
      console.log(`🌐 [BROWSER] ${text}`);
    }
  });

  page.on("pageerror", (error: any) => {
    console.error(`💥 [PAGE ERROR]`, error.message);
  });

  await page.exposeFunction("onReplayProgressUpdate", (_payload: any) => {
    // Progress is now handled by the browser console handler to avoid duplicates
    // This function is still needed for the event listener to work
  });

  let resolveFinished: () => void;
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });

  await page.exposeFunction("onReplayFinish", () => {
    console.log(`🏁 [REPLAY] Finished signal received`);
    resolveFinished();
  });

  try {
    await page.goto("about:blank");
    await page.setContent(html, { waitUntil: "load" });

    // Add a timeout for the replay based on duration
    // The replay duration is affected by speed setting, so account for that
    // Add significant buffer for loading/initialization and slow replay
    // Some recordings seem to replay much slower than expected, so use 10x duration
    const timeoutMs = Math.max(params.active_duration * 1000 * 10, 300000); // At least 5 minutes, or 10x expected duration

    console.log(
      `⏱️ [REPLAY] Expected duration: ${((params.active_duration * 1000) / 1000).toFixed(1)}s, timeout: ${(timeoutMs / 1000).toFixed(1)}s`,
    );

    await Promise.race([
      finished,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Replay timeout after ${timeoutMs / 1000}s`)),
          timeoutMs,
        ),
      ),
    ]);
  } catch (err) {
    console.error(`❌ [RENDER] Browser error:`, err);
    // Try to clean up
    try {
      await browser.close();
    } catch (closeErr) {
      console.error(`⚠️ [RENDER] Failed to close browser:`, closeErr);
    }
    throw err;
  }

  const pwVideoPath = (await page.video()?.path()) || "";
  await context.close();
  await browser.close();

  if (!pwVideoPath) throw new Error("Playwright did not produce a video file.");

  // Move to our final outPath
  await moveFile(pwVideoPath, outPath);
  console.log(`✅ [RENDER] Video rendered successfully: ${outPath}`);

  // 4) Probe duration via ffprobe
  const duration = await new Promise<number>((resolvePromise) => {
    const probe = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      outPath,
    ]);
    let buf = "";
    probe.stdout.on("data", (d) => (buf += String(d)));
    probe.on("close", () => {
      const sec = parseFloat(buf.trim());
      resolvePromise(
        Number.isFinite(sec)
          ? sec
          : Math.max(0, (lastTimestamp - firstTimestamp) / 1000),
      );
    });
  });

  console.log(`📊 [DURATION] Video duration: ${duration.toFixed(2)}s`);

  return { videoPath: outPath, videoDuration: duration };
}
