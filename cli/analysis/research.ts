import { readdir, readFile } from "node:fs/promises";
import { getVesaiPaths } from "../../config";
import { answerResearchQuestion, createVertexClient } from "../../connectors";
import type { CoreContext } from "./types";

type SessionResearchDocument = {
  sessionId: string;
  score: number | null;
  startTime: string | null;
  markdownPath: string;
  text: string;
};

export type ResearchResult = {
  question: string;
  answer: string;
  findings: string[];
  confidence: "low" | "medium" | "high";
  supportingSessionIds: string[];
  sessionsConsidered: number;
  sessionsUsed: number;
};

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .map((part) => part.trim())
        .filter((part) => part.length >= 3)
    )
  );
}

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return {};
  }

  const out: Record<string, unknown> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx <= 0) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    const raw = line.slice(idx + 1).trim();
    if (!key) {
      continue;
    }

    try {
      out[key] = JSON.parse(raw);
    } catch {
      out[key] = raw;
    }
  }

  return out;
}

function scoreDocument(questionTerms: string[], content: string): number {
  const normalized = content.toLowerCase();
  let score = 0;
  for (const term of questionTerms) {
    if (normalized.includes(term)) {
      score += 1;
    }
  }
  return score;
}

async function loadSessionResearchDocuments(
  homeDir?: string
): Promise<SessionResearchDocument[]> {
  const paths = getVesaiPaths(homeDir);
  const files = await readdir(paths.sessionsDir).catch(() => []);
  const markdownFiles = files.filter((name) => name.endsWith(".md"));

  const docs = await Promise.all(
    markdownFiles.map(async (fileName) => {
      const markdownPath = `${paths.sessionsDir}/${fileName}`;
      const content = await readFile(markdownPath, "utf8");
      const frontmatter = parseFrontmatter(content);
      const sessionId = String(
        frontmatter.session_id ?? frontmatter.id ?? fileName
      );
      const scoreValue = Number(frontmatter.score);
      return {
        sessionId,
        score: Number.isFinite(scoreValue) ? scoreValue : null,
        startTime:
          typeof frontmatter.start_time === "string"
            ? frontmatter.start_time
            : null,
        markdownPath,
        text: content,
      };
    })
  );

  return docs;
}

function pickResearchContext(params: {
  question: string;
  docs: SessionResearchDocument[];
  limit: number;
}): SessionResearchDocument[] {
  const terms = tokenize(params.question);
  const ranked = params.docs
    .map((doc) => ({
      doc,
      relevance: scoreDocument(terms, doc.text),
    }))
    .sort((a, b) => {
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }

      const aTime = Date.parse(a.doc.startTime || "");
      const bTime = Date.parse(b.doc.startTime || "");
      if (Number.isFinite(aTime) && Number.isFinite(bTime) && bTime !== aTime) {
        return bTime - aTime;
      }

      return (b.doc.score || 0) - (a.doc.score || 0);
    });

  const relevant = ranked
    .filter((entry) => entry.relevance > 0)
    .slice(0, params.limit)
    .map((entry) => entry.doc);

  if (relevant.length) {
    return relevant;
  }

  return ranked
    .slice(0, Math.max(1, Math.min(5, params.limit)))
    .map((entry) => entry.doc);
}

export async function researchFromAnalyzedSessions(params: {
  question: string;
  context: CoreContext;
  limit?: number;
}): Promise<ResearchResult> {
  const docs = await loadSessionResearchDocuments(params.context.homeDir);
  if (!docs.length) {
    throw new Error(
      "No analyzed sessions found in workspace. Run daemon backfill or `vesai user <email>` first."
    );
  }

  const parsedLimit =
    params.limit === undefined ? Number.NaN : Number(params.limit);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.floor(parsedLimit)
      : 12;
  const selected = pickResearchContext({
    question: params.question,
    docs,
    limit,
  });

  const ai = createVertexClient(
    params.context.config.gcloud.projectId,
    params.context.config.vertex.location
  );

  const response = await answerResearchQuestion({
    ai,
    model: params.context.config.vertex.model,
    productDescription: params.context.config.product.description,
    question: params.question,
    sessions: selected.map((doc) => ({
      sessionId: doc.sessionId,
      startTime: doc.startTime,
      score: doc.score,
      markdownPath: doc.markdownPath,
      summary: doc.text.slice(0, 12_000),
    })),
  });

  return {
    question: params.question,
    answer: response.answer,
    findings: response.findings,
    confidence: response.confidence,
    supportingSessionIds: response.supportingSessionIds,
    sessionsConsidered: docs.length,
    sessionsUsed: selected.length,
  };
}
