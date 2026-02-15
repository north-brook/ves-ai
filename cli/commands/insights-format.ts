export type ParsedPipeTable = {
  columns: string[];
  rows: string[][];
};

export type NormalizedSqlInsight = {
  kind: "table" | "text";
  columns: string[];
  rows: string[][];
  rowCount: number;
  raw: unknown;
};

export type NormalizedHogqlInsight = {
  kind: "hogql";
  query: Record<string, unknown> | null;
  table: ParsedPipeTable | null;
  artifactId: string | null;
  plan: string | null;
  raw: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parsePipeLines(lines: string[]): ParsedPipeTable | null {
  if (lines.length < 2) {
    return null;
  }

  const parsed = lines.map((line) =>
    line.split("|").map((cell) => cell.trim())
  );
  const width = parsed[0]?.length ?? 0;
  if (width < 2) {
    return null;
  }
  if (parsed.some((row) => row.length !== width)) {
    return null;
  }

  return {
    columns: parsed[0] ?? [],
    rows: parsed.slice(1),
  };
}

export function extractFirstPipeTable(text: string): ParsedPipeTable | null {
  const fenceRegex = /```(?:[\w-]+)?\n([\s\S]*?)```/g;
  const fencedBlocks = [...text.matchAll(fenceRegex)].map((match) => match[1]);
  const candidates = fencedBlocks.length ? fencedBlocks : [text];
  let best: ParsedPipeTable | null = null;
  let bestScore = -1;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]!;
    const lines = candidate
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.includes("|"));
    const table = parsePipeLines(lines);
    if (table) {
      const placeholderPenalty =
        table.columns[0]?.toLowerCase() === "column1" ? 1000 : 0;
      const score = table.rows.length - placeholderPenalty + i * 0.0001;
      if (score > bestScore) {
        best = table;
        bestScore = score;
      }
    }
  }

  return best;
}

export function normalizeSqlInsight(raw: unknown): NormalizedSqlInsight {
  if (typeof raw !== "string") {
    return {
      kind: "text",
      columns: [],
      rows: [],
      rowCount: 0,
      raw,
    };
  }

  const table = extractFirstPipeTable(raw);
  if (!table) {
    return {
      kind: "text",
      columns: [],
      rows: [],
      rowCount: 0,
      raw,
    };
  }

  return {
    kind: "table",
    columns: table.columns,
    rows: table.rows,
    rowCount: table.rows.length,
    raw,
  };
}

export function normalizeHogqlInsight(raw: unknown): NormalizedHogqlInsight {
  const normalized: NormalizedHogqlInsight = {
    kind: "hogql",
    query: null,
    table: null,
    artifactId: null,
    plan: null,
    raw,
  };

  if (!Array.isArray(raw)) {
    return normalized;
  }

  for (const item of raw) {
    const record = asRecord(item);
    const data = asRecord(record?.data);
    if (!data) {
      continue;
    }

    if (!normalized.query) {
      const answer = asRecord(data.answer);
      if (answer) {
        normalized.query = answer;
      }
    }

    if (!normalized.query) {
      const content = asRecord(data.content);
      const query = asRecord(content?.query);
      if (query) {
        normalized.query = query;
      }
    }

    if (!normalized.artifactId) {
      const artifactId = data.artifact_id;
      if (typeof artifactId === "string" && artifactId.trim()) {
        normalized.artifactId = artifactId;
      }
    }

    if (!normalized.plan) {
      const content = asRecord(data.content);
      const plan = content?.plan;
      if (typeof plan === "string" && plan.trim()) {
        normalized.plan = plan;
      }
    }

    if (!normalized.table) {
      const candidates: string[] = [];
      if (typeof data.content === "string") {
        candidates.push(data.content);
      }
      const content = asRecord(data.content);
      if (typeof content?.content === "string") {
        candidates.push(content.content);
      }

      for (const candidate of candidates) {
        const table = extractFirstPipeTable(candidate);
        if (table) {
          normalized.table = table;
          break;
        }
      }
    }
  }

  return normalized;
}
