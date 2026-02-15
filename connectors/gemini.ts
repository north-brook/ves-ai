import {
  createPartFromUri,
  createUserContent,
  GoogleGenAI,
  MediaResolution,
  ThinkingLevel,
  Type,
} from "@google/genai";

export type SessionIssue = {
  name: string;
  type: "bug" | "usability" | "suggestion" | "feature";
  severity: "critical" | "high" | "medium" | "low" | "suggestion";
  priority: "immediate" | "high" | "medium" | "low" | "backlog";
  confidence: "low" | "medium" | "high";
  times: [number, number][];
  story: string;
};

export type SessionAnalysis = {
  name: string;
  story: string;
  health: string;
  score: number;
  features: string[];
  detectedIssues: SessionIssue[];
};

export type AggregateAnalysis = {
  story: string;
  health: string;
  score: number;
};

export type ResearchAnswer = {
  answer: string;
  findings: string[];
  confidence: "low" | "medium" | "high";
  supportingSessionIds: string[];
};

function getSessionSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      story: { type: Type.STRING },
      health: { type: Type.STRING },
      score: { type: Type.NUMBER },
      features: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      detectedIssues: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            type: {
              type: Type.STRING,
              enum: ["bug", "usability", "suggestion", "feature"],
            },
            severity: {
              type: Type.STRING,
              enum: ["critical", "high", "medium", "low", "suggestion"],
            },
            priority: {
              type: Type.STRING,
              enum: ["immediate", "high", "medium", "low", "backlog"],
            },
            confidence: {
              type: Type.STRING,
              enum: ["low", "medium", "high"],
            },
            times: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
              },
            },
            story: { type: Type.STRING },
          },
          required: [
            "name",
            "type",
            "severity",
            "priority",
            "confidence",
            "times",
            "story",
          ],
        },
      },
    },
    required: [
      "name",
      "story",
      "health",
      "score",
      "features",
      "detectedIssues",
    ],
  };
}

function getAggregateSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      story: { type: Type.STRING },
      health: { type: Type.STRING },
      score: { type: Type.NUMBER },
    },
    required: ["story", "health", "score"],
  };
}

function getResearchSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      answer: { type: Type.STRING },
      findings: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      confidence: {
        type: Type.STRING,
        enum: ["low", "medium", "high"],
      },
      supportingSessionIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: ["answer", "findings", "confidence", "supportingSessionIds"],
  };
}

function parseJsonText<T>(text: string | undefined): T {
  if (!text) {
    throw new Error("Gemini returned empty response text");
  }
  return JSON.parse(text) as T;
}

export function createVertexClient(
  projectId: string,
  location: string
): GoogleGenAI {
  return new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location,
  });
}

export async function analyzeSessionVideo(params: {
  ai: GoogleGenAI;
  model: string;
  productDescription: string;
  videoUri: string;
  eventUri?: string;
  metadata: Record<string, unknown>;
}): Promise<SessionAnalysis> {
  const system = `You are an expert product UX analyst.
Analyze one session replay and produce a concise, accurate analysis.
Use evidence from the replay. Do not invent interactions.
The product context is: ${params.productDescription}`;

  const context = {
    metadata: params.metadata,
    eventUri: params.eventUri,
  };

  const response = await params.ai.models.generateContent({
    model: params.model,
    contents: [
      createUserContent(system),
      createUserContent([
        createPartFromUri(params.videoUri, "video/webm"),
        `Session context:\n${JSON.stringify(context, null, 2)}`,
      ]),
    ],
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH,
      },
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
      responseMimeType: "application/json",
      responseSchema: getSessionSchema(),
    },
  });

  return parseJsonText<SessionAnalysis>(response.text);
}

export async function analyzeUserAggregate(params: {
  ai: GoogleGenAI;
  model: string;
  productDescription: string;
  email: string;
  sessions: Array<{
    sessionId: string;
    startedAt: string | null;
    endedAt: string | null;
    activeSeconds: number | null;
    inactiveSeconds?: number | null;
    startUrl?: string | null;
    videoUri: string;
    eventsUri?: string;
    sessionAnalysis: SessionAnalysis;
  }>;
}): Promise<AggregateAnalysis> {
  const prompt = {
    productDescription: params.productDescription,
    userEmail: params.email,
    sessionCount: params.sessions.length,
    sessions: params.sessions,
    instructions:
      "Produce one comprehensive user story across all sessions. Use chronology and trends. Reflect confidence and uncertainty where needed.",
  };

  const response = await params.ai.models.generateContent({
    model: params.model,
    contents: [
      createUserContent(
        "You are an expert longitudinal user journey analyst. Return JSON only."
      ),
      createUserContent(JSON.stringify(prompt)),
    ],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: getAggregateSchema(),
    },
  });

  return parseJsonText<AggregateAnalysis>(response.text);
}

export async function analyzeGroupAggregate(params: {
  ai: GoogleGenAI;
  model: string;
  productDescription: string;
  groupId: string;
  users: Array<{
    email: string;
    sessions: number;
    story: string;
    health: string;
    score: number;
  }>;
}): Promise<AggregateAnalysis> {
  const prompt = {
    productDescription: params.productDescription,
    groupId: params.groupId,
    users: params.users,
    instructions:
      "Produce one comprehensive group story capturing adoption patterns, risk, and opportunities.",
  };

  const response = await params.ai.models.generateContent({
    model: params.model,
    contents: [
      createUserContent(
        "You are an expert organizational behavior analyst for product adoption. Return JSON only."
      ),
      createUserContent(JSON.stringify(prompt)),
    ],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: getAggregateSchema(),
    },
  });

  return parseJsonText<AggregateAnalysis>(response.text);
}

export async function answerResearchQuestion(params: {
  ai: GoogleGenAI;
  model: string;
  productDescription: string;
  question: string;
  sessions: Array<{
    sessionId: string;
    startTime: string | null;
    score: number | null;
    markdownPath: string;
    summary: string;
  }>;
}): Promise<ResearchAnswer> {
  const prompt = {
    productDescription: params.productDescription,
    question: params.question,
    availableSessionIds: params.sessions.map((session) => session.sessionId),
    sessions: params.sessions,
    instructions:
      "Answer the question using only provided sessions. Cite only session IDs from availableSessionIds. If evidence is weak, say so.",
  };

  const response = await params.ai.models.generateContent({
    model: params.model,
    contents: [
      createUserContent(
        "You are a replay research analyst. Use only supplied evidence. Return JSON only."
      ),
      createUserContent(JSON.stringify(prompt)),
    ],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: getResearchSchema(),
    },
  });

  return parseJsonText<ResearchAnswer>(response.text);
}
