import storage from "@/lib/storage";
import { promises as fs } from "fs";
import path from "path";

// Enums matching rrweb's structure
enum EventType {
  DomContentLoaded = 0,
  Load = 1,
  FullSnapshot = 2,
  IncrementalSnapshot = 3,
  Meta = 4,
  Custom = 5,
  Plugin = 6,
}

enum IncrementalSource {
  Mutation = 0,
  MouseMove = 1,
  MouseInteraction = 2,
  Scroll = 3,
  ViewportResize = 4,
  Input = 5,
  TouchMove = 6,
  MediaInteraction = 7,
  StyleSheetRule = 8,
  CanvasMutation = 9,
  Font = 10,
  Log = 11,
  Drag = 12,
  StyleDeclaration = 13,
  Selection = 14,
  AdoptedStyleSheet = 15,
  CustomElement = 16,
}

enum MouseInteractions {
  MouseUp = 0,
  MouseDown = 1,
  Click = 2,
  ContextMenu = 3,
  DblClick = 4,
  Focus = 5,
  Blur = 6,
  TouchStart = 7,
  TouchMove_Departed = 8,
  TouchEnd = 9,
  TouchCancel = 10,
}

// Simplified event structure
interface ContextEvent {
  time: string; // Video time in MM:SS format
  description: string; // Human-readable description
}

// Helper function to format duration
function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

// // Helper to get mouse interaction name
// function getMouseInteractionName(type: number): string {
//   switch (type) {
//     case MouseInteractions.Click:
//       return "Clicked";
//     case MouseInteractions.DblClick:
//       return "Double-clicked";
//     case MouseInteractions.ContextMenu:
//       return "Right-clicked";
//     case MouseInteractions.Focus:
//       return "Focused";
//     case MouseInteractions.Blur:
//       return "Blurred";
//     default:
//       return "Interacted with";
//   }
// }

// Helper to format video time
function formatVideoTime(videoTimeMs: number): string {
  const seconds = Math.floor(videoTimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

type RawEvent = {
  timestamp: number;
  type: EventType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

// Event processor class for streaming
class EventProcessor {
  private events: ContextEvent[] = [];
  private startTimestamp: number | null = null;
  private lastInteractionTime: number | null = null;
  private lastDescription = "";
  private skipPeriods: {
    start: number;
    end: number;
    originalDuration: number;
    videoDuration: number;
  }[] = [];
  private userInteractions: { timestamp: number }[] = [];

  private readonly SKIP_THRESHOLD = 10_000;
  private readonly SKIP_SPEED = 360;

  processEvent(event: RawEvent): void {
    // Initialize start timestamp
    if (this.startTimestamp === null) {
      this.startTimestamp = event.timestamp;
      this.lastInteractionTime = event.timestamp;
    }

    // Track user interactions for skip detection
    if (
      event.type === EventType.IncrementalSnapshot &&
      event.data?.source >= IncrementalSource.MouseMove &&
      event.data?.source <= IncrementalSource.Input
    ) {
      // Detect skip period
      const gap =
        event.timestamp - (this.lastInteractionTime || this.startTimestamp);
      if (gap > this.SKIP_THRESHOLD) {
        this.skipPeriods.push({
          start: this.lastInteractionTime || this.startTimestamp,
          end: event.timestamp,
          originalDuration: gap,
          videoDuration: gap / this.SKIP_SPEED,
        });
      }
      this.lastInteractionTime = event.timestamp;
      this.userInteractions.push({ timestamp: event.timestamp });
    }

    // Process meaningful events
    const videoTime = this.calculateVideoTimestamp(event.timestamp);
    const time = formatVideoTime(videoTime);
    let description: string | null = null;

    switch (event.type) {
      case EventType.Meta:
        if (event.data?.href) {
          description = `Navigated to ${event.data.href}`;
        }
        break;

      // case EventType.IncrementalSnapshot:
      //   if (!event.data) break;

      //   switch (event.data.source) {
      //     case IncrementalSource.MouseInteraction:
      //       if (event.data.type === MouseInteractions.Click) {
      //         const selector = event.data.id ? `element` : "page";
      //         description = `Clicked on ${selector}`;
      //       }
      //       break;

      //     case IncrementalSource.Scroll:
      //       description = `Scrolled the page`;
      //       break;

      //     case IncrementalSource.Input:
      //       description = `Entered text in input field`;
      //       break;

      //     case IncrementalSource.MediaInteraction:
      //       const mediaAction = event.data.type === 0 ? "played" : "paused";
      //       description = `Media ${mediaAction}`;
      //       break;

      //     case IncrementalSource.Selection:
      //       if (event.data.ranges?.length > 0) {
      //         description = `Selected text on page`;
      //       }
      //       break;
      //   }
      //   break;

      case EventType.Custom:
        if (event.data?.tag === "$pageview") {
          const path =
            event.data.payload?.href || event.data.payload?.$current_url;
          if (path) {
            description = `Viewed page: ${path}`;
          }
        } else if (event.data?.tag === "$pageleave") {
          description = `Left page: ${event.data.payload?.$current_url}`;
        }
        break;
    }

    // Add event if it has a description and isn't a duplicate
    if (description && description !== this.lastDescription) {
      this.events.push({ time, description });
      this.lastDescription = description;
    }
  }

  private calculateVideoTimestamp(originalTimestamp: number): number {
    if (!this.startTimestamp) return 0;

    let videoTime = originalTimestamp - this.startTimestamp;

    for (const skip of this.skipPeriods) {
      if (originalTimestamp <= skip.start) {
        break;
      } else if (originalTimestamp >= skip.end) {
        const timeSaved = skip.originalDuration - skip.videoDuration;
        videoTime -= timeSaved;
      } else {
        const intoSkip = originalTimestamp - skip.start;
        const videoIntoSkip = intoSkip / this.SKIP_SPEED;
        videoTime = skip.start - this.startTimestamp + videoIntoSkip;
        for (const prevSkip of this.skipPeriods) {
          if (prevSkip.end <= skip.start) {
            videoTime -= prevSkip.originalDuration - prevSkip.videoDuration;
          }
        }
        break;
      }
    }

    return videoTime;
  }

  getResults(): ContextEvent[] {
    // Add skip period events
    for (const skip of this.skipPeriods) {
      const skipStartVideo = this.calculateVideoTimestamp(skip.start);
      this.events.push({
        time: formatVideoTime(skipStartVideo),
        description: `Skipped ${formatDuration(skip.originalDuration)} of inactivity`,
      });
    }

    // Sort by time and deduplicate
    return this.events.sort((a, b) => {
      const [aMin, aSec] = a.time.split(":").map(Number);
      const [bMin, bSec] = b.time.split(":").map(Number);
      return aMin * 60 + aSec - (bMin * 60 + bSec);
    });
  }
}

// Simpler approach: download entire file and parse
async function* parseJSONStream(
  stream: NodeJS.ReadableStream,
): AsyncGenerator<RawEvent> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  let chunkCount = 0;

  console.log("📡 Starting JSON collection...");

  // Collect all chunks first
  for await (const chunk of stream) {
    chunkCount++;
    const chunkBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(chunkBuffer);
    totalBytes += chunkBuffer.length;

    if (chunkCount % 50 === 0) {
      console.log(
        `  📦 Collected ${chunkCount} chunks (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`,
      );
    }
  }

  console.log(
    `📡 Collection complete: ${chunkCount} chunks, ${(totalBytes / 1024 / 1024).toFixed(2)} MB total`,
  );

  // Concatenate all chunks and parse
  const fullBuffer = Buffer.concat(chunks);
  const jsonString = fullBuffer.toString("utf-8");

  console.log(`  🔍 JSON string length: ${jsonString.length} chars`);
  console.log(`  🔍 First 500 chars: ${jsonString.substring(0, 500)}`);

  let events: RawEvent[] = [];

  try {
    // Try to parse as complete JSON array
    events = JSON.parse(jsonString);
    console.log(
      `  ✅ Successfully parsed ${events.length} events from JSON array`,
    );
  } catch (e) {
    console.log(
      `  ⚠️ Failed to parse as complete JSON array: ${e instanceof Error ? e.message : String(e)}`,
    );

    // Fallback: try to extract individual objects
    const regex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    const matches = jsonString.match(regex) || [];

    console.log(
      `  🔄 Attempting regex extraction... found ${matches.length} potential objects`,
    );

    for (const match of matches) {
      try {
        const event = JSON.parse(match);
        if (event.timestamp) {
          // Basic validation
          events.push(event);
        }
      } catch {
        // Skip malformed objects
      }
    }

    console.log(`  📊 Extracted ${events.length} valid events via regex`);
  }

  // Yield events one by one
  for (const event of events) {
    yield event;
  }

  console.log(`📡 Parsing complete: yielded ${events.length} events`);
}

// Main function to construct context from event URI
export default async function constructContext({
  sessionId,
  eventUri,
}: {
  sessionId: string;
  eventUri: string;
}): Promise<string> {
  try {
    console.log(`\n🚀 Starting context construction for session: ${sessionId}`);
    console.log(`📍 Event URI: ${eventUri}`);

    // Parse the GCS URI (format: gs://bucket/path or just path)
    const bucketName = "ves.ai";
    const fileName = eventUri.replace(/^gs:\/\/[^\/]+\//, "");

    console.log(`📂 GCS Path: gs://${bucketName}/${fileName}`);

    // Create GCS file reference
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      console.error(`❌ File does not exist: ${fileName}`);
      throw new Error(`File not found in GCS: ${fileName}`);
    }

    // Get file metadata
    const [metadata] = await file.getMetadata();
    console.log(
      `📊 File size: ${metadata.size} bytes (${((Number(metadata.size) || 0) / 1024 / 1024).toFixed(2)} MB)`,
    );

    // Create event processor
    const processor = new EventProcessor();
    console.log(`🔧 Event processor initialized`);

    // Create read stream from GCS
    const readStream = file.createReadStream();
    console.log(`📖 Starting to stream file from GCS...`);

    // Process events as they stream
    let eventCount = 0;
    let lastLoggedCount = 0;

    for await (const event of parseJSONStream(readStream)) {
      processor.processEvent(event);
      eventCount++;

      // Log progress every 1000 events
      if (eventCount - lastLoggedCount >= 1000) {
        console.log(`  ⚡ Processing... ${eventCount} events processed`);
        lastLoggedCount = eventCount;
      }
    }

    console.log(
      `✨ Stream processing complete: ${eventCount} events processed`,
    );

    // Get processed context events
    const contextEvents = processor.getResults();
    console.log(`📝 Generated ${contextEvents.length} context events`);

    // Parse context events into string
    const contextString = contextEvents
      .map((e) => `${e.time} - ${e.description}`)
      .join("\n");

    // Save debug output if sessionId is provided
    if (sessionId) {
      try {
        const debugDir = path.join(process.cwd(), "app", "jobs", "debug");

        // Ensure debug directory exists
        await fs.mkdir(debugDir, { recursive: true });

        const debugFile = path.join(debugDir, `debug-context-${sessionId}.txt`);

        // Write debug file
        await fs.writeFile(debugFile, contextString, "utf-8");
        console.log(`💾 Debug context saved to: ${debugFile}`);

        // Also save event count for debugging
        const statsFile = path.join(debugDir, `debug-stats-${sessionId}.txt`);
        const stats = `Session: ${sessionId}
Event URI: ${eventUri}
Total events processed: ${eventCount}
Context events generated: ${contextEvents.length}
Context string length: ${contextString.length} chars`;
        await fs.writeFile(statsFile, stats, "utf-8");
        console.log(`📈 Debug stats saved to: ${statsFile}`);
      } catch (debugError) {
        // Log but don't fail if debug file can't be written
        console.error("❌ Failed to write debug file:", debugError);
      }
    }

    return contextString;
  } catch (error) {
    console.error("Error constructing context:", error);
    throw new Error(`Failed to construct context from ${eventUri}: ${error}`);
  }
}
