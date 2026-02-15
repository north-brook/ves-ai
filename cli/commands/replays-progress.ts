import type { SessionBatchProgressEvent } from "../analysis/session";

type InFlightSession = {
  estimatedSeconds: number;
  startedAt: number;
};

function formatDuration(seconds: number): string {
  if (!(Number.isFinite(seconds) && seconds > 0)) {
    return "00:00";
  }
  const whole = Math.max(0, Math.round(seconds));
  const hrs = Math.floor(whole / 3600);
  const mins = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function renderBar(percent: number, width = 26): string {
  const safe = Math.min(1, Math.max(0, percent));
  const filled = Math.round(safe * width);
  const empty = Math.max(0, width - filled);
  return `[${"=".repeat(filled)}${" ".repeat(empty)}]`;
}

export function createReplayProgressRenderer(params: {
  label: string;
  stream?: NodeJS.WriteStream;
}) {
  const stream = params.stream ?? process.stdout;
  const inFlight = new Map<string, InFlightSession>();

  let timer: NodeJS.Timeout | null = null;
  let totalSessions = 0;
  let completedSessions = 0;
  let failedSessions = 0;
  let totalWeight = 0;
  let completedWeight = 0;
  let startedAt = 0;
  let concurrency = 1;
  let active = false;

  function estimateDynamicCompletedWeight(now: number): number {
    let partialWeight = 0;
    for (const session of inFlight.values()) {
      const elapsedSeconds = Math.max(0, (now - session.startedAt) / 1000);
      const ratio = Math.min(0.95, elapsedSeconds / session.estimatedSeconds);
      partialWeight += session.estimatedSeconds * ratio;
    }
    return Math.min(totalWeight, completedWeight + partialWeight);
  }

  function render(): void {
    if (!(active && startedAt)) {
      return;
    }

    const now = Date.now();
    const elapsedSeconds = Math.max(0.001, (now - startedAt) / 1000);
    const dynamicCompleted = estimateDynamicCompletedWeight(now);
    const percent =
      totalWeight > 0 ? Math.min(1, dynamicCompleted / totalWeight) : 1;
    const throughput = dynamicCompleted / elapsedSeconds;
    const remainingWeight = Math.max(0, totalWeight - dynamicCompleted);
    const fallbackRate = Math.max(0.25, concurrency * 0.35);
    const etaSeconds =
      throughput > 0.05
        ? remainingWeight / throughput
        : remainingWeight / fallbackRate;

    const line =
      `${params.label} ${renderBar(percent)} ${(percent * 100).toFixed(1)}%` +
      ` | ${completedSessions}/${totalSessions} sessions` +
      ` | in-flight ${inFlight.size}` +
      ` | ETA ${formatDuration(etaSeconds)}` +
      ` | elapsed ${formatDuration(elapsedSeconds)}`;
    stream.write(`\r${line.padEnd(132, " ")}`);
  }

  function stopTimer(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function finishSummary(): void {
    render();
    stream.write("\n");
    if (failedSessions > 0) {
      stream.write(
        `${params.label} finished with ${failedSessions} failed session${failedSessions === 1 ? "" : "s"}.\n`
      );
    } else {
      stream.write(`${params.label} complete.\n`);
    }
  }

  function handle(event: SessionBatchProgressEvent): void {
    if (event.type === "batch-start") {
      totalSessions = event.totalSessions;
      completedSessions = 0;
      failedSessions = 0;
      totalWeight = Math.max(1, event.totalEstimatedSeconds);
      completedWeight = 0;
      startedAt = Date.now();
      concurrency = Math.max(1, event.concurrency);
      active = true;
      stopTimer();
      timer = setInterval(render, 250);
      render();
      return;
    }

    if (event.type === "session-start") {
      inFlight.set(event.sessionId, {
        estimatedSeconds: Math.max(1, event.estimatedSeconds),
        startedAt: Date.now(),
      });
      render();
      return;
    }

    if (event.type === "session-complete") {
      completedSessions = event.completed;
      completedWeight += Math.max(1, event.estimatedSeconds);
      inFlight.delete(event.sessionId);
      render();
      return;
    }

    if (event.type === "session-failed") {
      completedSessions = event.completed;
      failedSessions += 1;
      completedWeight += Math.max(1, event.estimatedSeconds);
      inFlight.delete(event.sessionId);
      render();
      stream.write(`\nFailed session ${event.sessionId}: ${event.error}\n`);
      return;
    }

    if (event.type === "batch-complete") {
      stopTimer();
      active = false;
      finishSummary();
    }
  }

  function close(): void {
    stopTimer();
    active = false;
  }

  return {
    handle,
    close,
  };
}
