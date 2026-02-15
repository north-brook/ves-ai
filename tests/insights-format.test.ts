import { describe, expect, it } from "bun:test";
import {
  extractFirstPipeTable,
  normalizeHogqlInsight,
  normalizeSqlInsight,
} from "../cli/commands/insights-format";

describe("insights format helpers", () => {
  it("extracts first pipe table from fenced text", () => {
    const input = `
Some intro text
\`\`\`
event|count()
$pageview|42
$autocapture|11
\`\`\`
`;

    const table = extractFirstPipeTable(input);
    expect(table).not.toBeNull();
    expect(table?.columns).toEqual(["event", "count()"]);
    expect(table?.rows).toEqual([
      ["$pageview", "42"],
      ["$autocapture", "11"],
    ]);
  });

  it("prefers richer results table over placeholder examples", () => {
    const input = `
\`\`\`
column1|column2
value1|value2
\`\`\`

\`\`\`
event|count()
$pageview|42
$autocapture|11
$groupidentify|7
\`\`\`
`;

    const table = extractFirstPipeTable(input);
    expect(table?.columns).toEqual(["event", "count()"]);
    expect(table?.rows.length).toBe(3);
  });

  it("normalizes SQL insight payload to structured rows", () => {
    const raw = `
You are given a table:
\`\`\`
event|count()
$pageview|99
$groupidentify|50
\`\`\`
`;

    const normalized = normalizeSqlInsight(raw);
    expect(normalized.kind).toBe("table");
    expect(normalized.rowCount).toBe(2);
    expect(normalized.columns).toEqual(["event", "count()"]);
    expect(normalized.rows[0]).toEqual(["$pageview", "99"]);
  });

  it("normalizes HogQL insight payload to query + table", () => {
    const raw = [
      {
        type: "message",
        data: {
          answer: {
            kind: "TrendsQuery",
            interval: "week",
          },
        },
      },
      {
        type: "message",
        data: {
          content: `Result:
\`\`\`
Date|active_users
2026-02-01|120
\`\`\``,
          artifact_id: "abc123",
        },
      },
    ];

    const normalized = normalizeHogqlInsight(raw);
    expect(normalized.query).not.toBeNull();
    expect(normalized.artifactId).toBe("abc123");
    expect(normalized.table?.columns).toEqual(["Date", "active_users"]);
    expect(normalized.table?.rows).toEqual([["2026-02-01", "120"]]);
  });
});
