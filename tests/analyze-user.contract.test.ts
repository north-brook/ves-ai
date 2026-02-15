import { describe, expect, it, mock } from "bun:test";
import type { SessionAnalysis } from "../packages/connectors/src";
import type { SessionAnalysisResult } from "../packages/core/src/analysis/types";
import {
  type AnalyzeUserDeps,
  analyzeUserByEmailWithDeps,
  buildUserAggregateSessions,
} from "../packages/core/src/analysis/user";
import { makeConfig } from "./helpers";

const sessionAnalysis: SessionAnalysis = {
  name: "Checkout flow",
  story: "User progressed through checkout.",
  health: "Mostly smooth",
  score: 78,
  features: ["Checkout"],
  detectedIssues: [],
};

function makeSessionResult(params: {
  id: string;
  startedAt: string;
  score: number;
}): SessionAnalysisResult {
  return {
    recording: {
      id: params.id,
      start_time: params.startedAt,
      end_time: "2026-01-01T00:01:00.000Z",
      active_seconds: 60,
      inactive_seconds: 10,
      start_url: "https://app.example.com/checkout",
      person: { properties: { email: "test@example.com" } },
    },
    render: {
      sessionId: params.id,
      eventsUri: `gs://bucket/${params.id}.json`,
      videoUri: `gs://bucket/${params.id}.webm`,
      videoDuration: 60,
      renderedAt: "2026-01-01T00:02:00.000Z",
    },
    analysis: {
      ...sessionAnalysis,
      name: `${sessionAnalysis.name} ${params.id}`,
      score: params.score,
    },
    markdownPath: `/tmp/${params.id}.md`,
  };
}

describe("analyze user contract", () => {
  it("builds aggregate sessions in chronological order with metadata", () => {
    const unordered = [
      makeSessionResult({
        id: "s2",
        startedAt: "2026-01-02T00:00:00.000Z",
        score: 82,
      }),
      makeSessionResult({
        id: "s1",
        startedAt: "2026-01-01T00:00:00.000Z",
        score: 74,
      }),
    ];

    const aggregate = buildUserAggregateSessions(unordered);

    expect(aggregate.map((session) => session.sessionId)).toEqual(["s1", "s2"]);
    expect(aggregate[0]?.eventsUri).toContain("s1.json");
    expect(aggregate[0]?.startUrl).toContain("example.com");
    expect(aggregate[0]?.sessionAnalysis.score).toBe(74);
  });

  it("enforces per-session analysis before single aggregate call", async () => {
    const callOrder: string[] = [];
    const context = {
      config: makeConfig(),
      homeDir: "/tmp/vesai-test",
    };

    const recordings = [{ id: "s1" }, { id: "s2" }];
    const sessionResults = [
      makeSessionResult({
        id: "s2",
        startedAt: "2026-01-02T00:00:00.000Z",
        score: 82,
      }),
      makeSessionResult({
        id: "s1",
        startedAt: "2026-01-01T00:00:00.000Z",
        score: 74,
      }),
    ];

    let aggregateInputSessionIds: string[] = [];
    let sessionAnalysisCompleted = false;

    const deps: AnalyzeUserDeps = {
      findRecordingsByUserEmail: mock(async () => {
        callOrder.push("find");
        return recordings as never[];
      }) as AnalyzeUserDeps["findRecordingsByUserEmail"],
      renderAndAnalyzeSessions: mock(async () => {
        callOrder.push("render");
        sessionAnalysisCompleted = true;
        return sessionResults;
      }) as AnalyzeUserDeps["renderAndAnalyzeSessions"],
      createVertexClient: mock(() => {
        callOrder.push("client");
        return {} as never;
      }) as AnalyzeUserDeps["createVertexClient"],
      analyzeUserAggregate: mock(
        async ({ sessions }: { sessions: Array<{ sessionId: string }> }) => {
          callOrder.push("aggregate");
          expect(sessionAnalysisCompleted).toBe(true);
          aggregateInputSessionIds = sessions.map(
            (session: { sessionId: string }) => session.sessionId
          );
          return {
            story: "Comprehensive user story",
            health: "Healthy user",
            score: 88,
          };
        }
      ) as AnalyzeUserDeps["analyzeUserAggregate"],
      summarizeSessionResults: mock(() => ({
        averageScore: 78,
        count: 2,
      })) as AnalyzeUserDeps["summarizeSessionResults"],
      writeUserMarkdown: mock(async () => {
        callOrder.push("write");
        return "/tmp/user.md";
      }) as AnalyzeUserDeps["writeUserMarkdown"],
      now: () => "2026-02-14T00:00:00.000Z",
    };

    const result = await analyzeUserByEmailWithDeps({
      email: "test@example.com",
      context,
      deps,
    });

    expect(callOrder).toEqual([
      "find",
      "render",
      "client",
      "aggregate",
      "write",
    ]);
    expect(aggregateInputSessionIds).toEqual(["s1", "s2"]);
    expect(result.sessionCount).toBe(2);
    expect(result.userScore).toBe(88);
    expect(result.markdownPath).toBe("/tmp/user.md");
  });
});
