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
  time: string; // Video time in MM:SS format (accounting for skip periods)
  description: string; // Human-readable description
  type:
    | "click"
    | "navigation"
    | "input"
    | "scroll"
    | "media"
    | "selection"
    | "skip";
  timestamp: number; // Original timestamp from events
  videoTimestamp?: number; // Calculated video timestamp in ms
}

// Helper function to format timestamp to session time (MM:SS)
function formatSessionTime(timestamp: number, startTimestamp: number): string {
  const seconds = Math.floor((timestamp - startTimestamp) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
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

// Helper to get mouse interaction name
function getMouseInteractionName(type: number): string {
  switch (type) {
    case MouseInteractions.MouseUp:
      return "mouse up";
    case MouseInteractions.MouseDown:
      return "mouse down";
    case MouseInteractions.Click:
      return "click";
    case MouseInteractions.ContextMenu:
      return "context menu";
    case MouseInteractions.DblClick:
      return "double click";
    case MouseInteractions.Focus:
      return "focus";
    case MouseInteractions.Blur:
      return "blur";
    case MouseInteractions.TouchStart:
      return "touch start";
    case MouseInteractions.TouchEnd:
      return "touch end";
    case MouseInteractions.TouchCancel:
      return "touch cancel";
    default:
      return "interaction";
  }
}

// Process a single rrweb event into a simplified activity log
function processRawEvent(
  event: any,
  startTimestamp: number,
): ContextEvent | null {
  const time = formatSessionTime(event.timestamp, startTimestamp);

  switch (event.type) {
    case EventType.Meta:
      // Only keep important meta events
      if (event.data?.href) {
        const url = event.data.href;
        return {
          type: "navigation",
          time,
          description: `Navigated to ${url}`,
          timestamp: event.timestamp,
        };
      }
      return null;

    case EventType.IncrementalSnapshot:
      if (!event.data) return null;

      switch (event.data.source) {
        case IncrementalSource.MouseInteraction:
          return null;

        case IncrementalSource.Scroll:
          return null;

        case IncrementalSource.Input:
          return null;

        case IncrementalSource.MediaInteraction:
          return null;

        case IncrementalSource.Selection:
          return null;
      }
      break;
  }

  return null;
}

// Main function to construct activity log
export default async function constructEvents({
  sessionId,
  eventsPath,
}: {
  sessionId: string;
  eventsPath: string;
}): Promise<ContextEvent[]> {
  const events: ContextEvent[] = [];
  let startTimestamp: number;
  let mouseMoveBuffer: any[] = [];
  let lastMouseMoveTimestamp = 0;
  let lastEventDescription = "";

  // Read and parse JSON file
  console.log(`Reading events from: ${eventsPath}`);
  const fs = await import("fs/promises");
  const eventsContent = await fs.readFile(eventsPath, "utf-8");
  const rawEvents = JSON.parse(eventsContent);
  console.log(`Parsed ${rawEvents.length} raw events`);

  // Sort events by timestamp to ensure chronological order
  rawEvents.sort((a: any, b: any) => a.timestamp - b.timestamp);

  // Get start timestamp
  if (rawEvents.length > 0) {
    startTimestamp = rawEvents[0].timestamp;
    console.log(`Start timestamp: ${startTimestamp}`);
  } else {
    console.log(`Warning: No events found in file`);
    return events;
  }

  // Detect inactive periods and calculate video timestamps
  // skipInactive uses 60x speed for gaps > 10 seconds between user interactions
  const SKIP_THRESHOLD = 10000; // 10 seconds in ms
  const SKIP_SPEED = 60; // 60x speed
  const skipPeriods: {
    start: number;
    end: number;
    originalDuration: number;
    videoDuration: number;
  }[] = [];

  // Find user interaction events to detect gaps
  const userInteractions: any[] = [];
  for (const evt of rawEvents) {
    if (
      evt.type === EventType.IncrementalSnapshot &&
      evt.data?.source >= IncrementalSource.MouseMove &&
      evt.data?.source <= IncrementalSource.Input
    ) {
      userInteractions.push(evt);
    }
  }

  // Detect skip periods
  let lastInteractionTime = startTimestamp;
  for (const interaction of userInteractions) {
    const gap = interaction.timestamp - lastInteractionTime;
    if (gap > SKIP_THRESHOLD) {
      skipPeriods.push({
        start: lastInteractionTime,
        end: interaction.timestamp,
        originalDuration: gap,
        videoDuration: gap / SKIP_SPEED,
      });
    }
    lastInteractionTime = interaction.timestamp;
  }

  // Add final skip period if there's a gap at the end
  // Check if there are non-interaction events after the last user interaction
  if (rawEvents.length > 0 && userInteractions.length > 0) {
    const lastEvent = rawEvents[rawEvents.length - 1];
    const lastUserInteraction = userInteractions[userInteractions.length - 1];
    
    // If last user interaction is not the last event, check for gap
    if (lastUserInteraction.timestamp < lastEvent.timestamp) {
      const finalGap = lastEvent.timestamp - lastUserInteraction.timestamp;
      if (finalGap > SKIP_THRESHOLD) {
        skipPeriods.push({
          start: lastUserInteraction.timestamp,
          end: lastEvent.timestamp,
          originalDuration: finalGap,
          videoDuration: finalGap / SKIP_SPEED,
        });
      }
    }
  } else if (rawEvents.length > 0 && userInteractions.length === 0) {
    // Edge case: No user interactions at all, but we have events
    const lastEvent = rawEvents[rawEvents.length - 1];
    const gap = lastEvent.timestamp - startTimestamp;
    if (gap > SKIP_THRESHOLD) {
      skipPeriods.push({
        start: startTimestamp,
        end: lastEvent.timestamp,
        originalDuration: gap,
        videoDuration: gap / SKIP_SPEED,
      });
    }
  }

  console.log(`Found ${skipPeriods.length} skip periods`);

  // Helper to calculate video timestamp
  function calculateVideoTimestamp(originalTimestamp: number): number {
    let videoTime = originalTimestamp - startTimestamp;

    // Adjust for skip periods
    for (const skip of skipPeriods) {
      if (originalTimestamp <= skip.start) {
        // Event is before this skip period
        break;
      } else if (originalTimestamp >= skip.end) {
        // Event is after this skip period - subtract the time saved
        const timeSaved = skip.originalDuration - skip.videoDuration;
        videoTime -= timeSaved;
      } else {
        // Event is during this skip period
        const intoSkip = originalTimestamp - skip.start;
        const videoIntoSkip = intoSkip / SKIP_SPEED;
        videoTime = skip.start - startTimestamp + videoIntoSkip;
        // Subtract time saved from previous skips
        for (const prevSkip of skipPeriods) {
          if (prevSkip.end <= skip.start) {
            videoTime -= prevSkip.originalDuration - prevSkip.videoDuration;
          }
        }
        break;
      }
    }

    return videoTime;
  }

  // Helper to format video time
  function formatVideoTime(videoTimeMs: number): string {
    const seconds = Math.floor(videoTimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  // First, add skip events and process raw events
  const processedEvents: ContextEvent[] = [];

  // Add skip period events
  for (const skip of skipPeriods) {
    const skipStartVideo = calculateVideoTimestamp(skip.start);

    processedEvents.push({
      type: "skip",
      time: formatVideoTime(skipStartVideo),
      description: `Skipping ${formatDuration(skip.originalDuration)} of inactivity (${formatDuration(skip.videoDuration)} at 60x speed)`,
      timestamp: skip.start,
      videoTimestamp: skipStartVideo,
    });
  }

  // Process each raw event
  for (const rawEvent of rawEvents) {
    // Skip mouse move events - handle them separately if needed
    if (
      rawEvent.type === EventType.IncrementalSnapshot &&
      rawEvent.data?.source === IncrementalSource.MouseMove
    ) {
      continue;
    }

    // Process other events
    const log = processRawEvent(rawEvent, startTimestamp);
    if (log) {
      // Calculate video timestamp for this event
      const videoTs = calculateVideoTimestamp(log.timestamp);
      const eventWithVideoTime: ContextEvent = {
        ...log,
        time: formatVideoTime(videoTs),
        videoTimestamp: videoTs,
      };

      // Deduplicate consecutive identical events (like repeated $url_changed)
      if (
        log.description === lastEventDescription &&
        log.timestamp -
          (processedEvents[processedEvents.length - 1]?.timestamp || 0) <
          100
      ) {
        // Skip duplicate
      } else {
        processedEvents.push(eventWithVideoTime);
        lastEventDescription = log.description;
      }
    }
  }

  // Sort by video timestamp to interleave skip events with other events properly
  processedEvents.sort(
    (a, b) => (a.videoTimestamp || 0) - (b.videoTimestamp || 0),
  );

  events.push(...processedEvents);

  // Final filtering: Focus on user interactions, page changes, and skip events
  const filteredEvents = events.filter((event, index) => {
    // Always keep skip events
    if (event.type === "skip") {
      return true;
    }

    // Keep scrolls but remove duplicates within 3 second
    if (event.type === "scroll") {
      const prevScroll = events
        .slice(Math.max(0, index - 10), index)
        .reverse()
        .find((e) => e.type === "scroll");
      if (prevScroll && event.timestamp - prevScroll.timestamp < 3000) {
        return false;
      }
      return true;
    }

    // Keep all user interactions and navigation events
    return (
      event.type === "click" ||
      event.type === "input" ||
      event.type === "navigation" ||
      event.type === "media" ||
      event.type === "selection"
    );
  });

  let finalEvents: ContextEvent[] = filteredEvents;

  console.log(
    `Constructed ${finalEvents.length} meaningful events (filtered from ${rawEvents.length} raw events)`,
  );
  if (finalEvents.length > 0) {
    const eventTypes = finalEvents.reduce(
      (acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    console.log(`Event breakdown:`, eventTypes);

    // Show time coverage
    const sessionDuration =
      (finalEvents[finalEvents.length - 1].timestamp -
        finalEvents[0].timestamp) /
      1000;
    const videoDuration =
      (finalEvents[finalEvents.length - 1].videoTimestamp || 0) / 1000;
    console.log(`Session duration: ${sessionDuration.toFixed(1)}s`);
    console.log(
      `Video duration: ${videoDuration.toFixed(1)}s (with skip periods at 60x)`,
    );

    // Log skip periods summary
    if (skipPeriods.length > 0) {
      const totalSkippedTime =
        skipPeriods.reduce((acc, s) => acc + s.originalDuration, 0) / 1000;
      const totalVideoTime =
        skipPeriods.reduce((acc, s) => acc + s.videoDuration, 0) / 1000;
      console.log(
        `Skipped ${totalSkippedTime.toFixed(1)}s of inactivity → ${totalVideoTime.toFixed(1)}s in video`,
      );
    }
  }

  // Save debug JSON for processed events
  try {
    const { join } = await import("path");
    const debugEventsPath = join(__dirname, `debug-events-${sessionId}.json`);
    await fs.writeFile(debugEventsPath, JSON.stringify(finalEvents, null, 2));
    console.log(`Debug: Saved processed events to ${debugEventsPath}`);
  } catch (err) {
    console.warn(`Warning: Failed to save debug events:`, err);
  }

  return finalEvents;
}

// Export types for external use
export type { ContextEvent };
