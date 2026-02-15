import { describe, expect, it, mock } from "bun:test";
import {
  analyzeGroupAggregate,
  analyzeSessionVideo,
  analyzeUserAggregate,
  answerResearchQuestion,
} from "../connectors/gemini";

describe("gemini connector", () => {
  it("parses aggregate user analysis JSON", async () => {
    const generateContent = mock(async () => ({
      text: JSON.stringify({
        story: "Comprehensive user story",
        health: "Healthy",
        score: 87,
      }),
    }));

    const ai = {
      models: {
        generateContent,
      },
    } as never;

    const result = await analyzeUserAggregate({
      ai,
      model: "gemini-3-pro-preview",
      productDescription: "Demo product",
      email: "test@example.com",
      sessions: [
        {
          sessionId: "s1",
          startedAt: "2026-01-01T00:00:00.000Z",
          endedAt: "2026-01-01T00:02:00.000Z",
          activeSeconds: 120,
          inactiveSeconds: 5,
          startUrl: "https://app.example.com/checkout",
          videoUri: "gs://bucket/s1.webm",
          eventsUri: "gs://bucket/s1.json",
          sessionAnalysis: {
            name: "Checkout",
            story: "Session story",
            health: "Healthy",
            score: 80,
            features: ["Checkout"],
            detectedIssues: [],
          },
        },
      ],
    });

    expect(result.score).toBe(87);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("parses aggregate group analysis JSON", async () => {
    const generateContent = mock(async () => ({
      text: JSON.stringify({
        story: "Group adoption story",
        health: "Good",
        score: 75,
      }),
    }));

    const ai = {
      models: {
        generateContent,
      },
    } as never;

    const result = await analyzeGroupAggregate({
      ai,
      model: "gemini-3-pro-preview",
      productDescription: "Demo product",
      groupId: "acme",
      users: [
        {
          email: "user@example.com",
          sessions: 4,
          story: "Story",
          health: "Health",
          score: 70,
        },
      ],
    });

    expect(result.health).toBe("Good");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("analyzes one session video and validates empty response handling", async () => {
    const successGenerateContent = mock(async () => ({
      text: JSON.stringify({
        name: "Checkout flow",
        story: "User completed checkout",
        health: "Healthy",
        score: 82,
        features: ["Checkout"],
        detectedIssues: [],
      }),
    }));

    const successAi = {
      models: {
        generateContent: successGenerateContent,
      },
    } as never;

    const analysis = await analyzeSessionVideo({
      ai: successAi,
      model: "gemini-3-pro-preview",
      productDescription: "Demo product",
      videoUri: "gs://bucket/s1.webm",
      eventUri: "gs://bucket/s1.json",
      metadata: {
        sessionId: "s1",
      },
    });

    expect(analysis.name).toBe("Checkout flow");

    const failingAi = {
      models: {
        generateContent: mock(async () => ({ text: undefined })),
      },
    } as never;

    let thrown = false;
    try {
      await analyzeSessionVideo({
        ai: failingAi,
        model: "gemini-3-pro-preview",
        productDescription: "Demo product",
        videoUri: "gs://bucket/s2.webm",
        metadata: { sessionId: "s2" },
      });
    } catch (error) {
      thrown = true;
      expect(String(error)).toContain("empty response text");
    }

    expect(thrown).toBe(true);
  });

  it("parses research answer JSON", async () => {
    const generateContent = mock(async () => ({
      text: JSON.stringify({
        answer: "Most drop-off follows payment errors.",
        findings: [
          "Card validation loops appear repeatedly",
          "Users abandon after 2-3 retries",
        ],
        confidence: "medium",
        supportingSessionIds: ["s1", "s2"],
      }),
    }));

    const ai = {
      models: {
        generateContent,
      },
    } as never;

    const result = await answerResearchQuestion({
      ai,
      model: "gemini-3-pro-preview",
      productDescription: "Demo product",
      question: "Why do users drop at payment?",
      sessions: [
        {
          sessionId: "s1",
          startTime: "2026-01-01T00:00:00.000Z",
          score: 60,
          markdownPath: "/tmp/s1.md",
          summary: "Payment validation errors observed.",
        },
      ],
    });

    expect(result.confidence).toBe("medium");
    expect(result.supportingSessionIds).toEqual(["s1", "s2"]);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});
