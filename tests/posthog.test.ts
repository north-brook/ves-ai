import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  findRecordingsByGroupId,
  findRecordingsByQuery,
  findRecordingsByUserEmail,
  getRecordingUserEmail,
  listAllRecordings,
} from "../packages/connectors/src/posthog";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("posthog connector", () => {
  it("extracts user emails from common person properties", () => {
    const recording = {
      id: "s1",
      person: {
        properties: {
          $email: "TEST@EXAMPLE.COM",
        },
      },
    };

    expect(getRecordingUserEmail(recording)).toBe("test@example.com");
  });

  it("paginates listAllRecordings", async () => {
    let callCount = 0;
    globalThis.fetch = mock(async () => {
      callCount++;

      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            results: [{ id: "s1" }, { id: "s2" }],
            has_next: true,
          }),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          results: [{ id: "s3" }],
          has_next: false,
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const results = await listAllRecordings({
      apiKey: "key",
      projectId: "123",
      maxPages: 5,
    });

    expect(results.map((recording) => recording.id)).toEqual([
      "s1",
      "s2",
      "s3",
    ]);
    expect(callCount).toBe(2);
  });

  it("filters user recordings by domain, email, and status", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          results: [
            {
              id: "keep",
              start_url: "https://app.example.com/dashboard",
              person: { properties: { email: "target@example.com" } },
              ongoing: false,
            },
            {
              id: "wrong-domain",
              start_url: "https://other.site/path",
              person: { properties: { email: "target@example.com" } },
              ongoing: false,
            },
            {
              id: "ongoing",
              start_url: "https://app.example.com/settings",
              person: { properties: { email: "target@example.com" } },
              ongoing: true,
            },
          ],
          has_next: false,
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const results = await findRecordingsByUserEmail({
      apiKey: "key",
      projectId: "123",
      email: "target@example.com",
      domainFilter: "example.com",
    });

    expect(results.map((recording) => recording.id)).toEqual(["keep"]);
  });

  it("filters by group id and query", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          results: [
            {
              id: "g1",
              start_url: "https://app.example.com/a",
              person: { properties: { company_id: "acme" } },
              ongoing: false,
            },
            {
              id: "g2",
              start_url: "https://app.example.com/checkout",
              person: { properties: { company_id: "acme", role: "buyer" } },
              ongoing: false,
            },
          ],
          has_next: false,
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const byGroup = await findRecordingsByGroupId({
      apiKey: "key",
      projectId: "123",
      groupKey: "company_id",
      groupId: "acme",
      domainFilter: "example.com",
    });

    const byQuery = await findRecordingsByQuery({
      apiKey: "key",
      projectId: "123",
      query: "checkout",
      domainFilter: "example.com",
    });

    expect(byGroup.length).toBe(2);
    expect(byQuery.map((recording) => recording.id)).toEqual(["g2"]);
  });

  it("supports advanced query filters (date, activity, properties, limit)", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          results: [
            {
              id: "s1",
              start_time: "2026-01-10T00:00:00.000Z",
              active_seconds: 20,
              distinct_id: "d1",
              start_url: "https://app.example.com/checkout",
              person: { properties: { email: "a@example.com", plan: "pro" } },
              ongoing: false,
            },
            {
              id: "s2",
              start_time: "2026-01-20T00:00:00.000Z",
              active_seconds: 90,
              distinct_id: "d2",
              start_url: "https://app.example.com/checkout",
              person: {
                properties: { email: "target@example.com", plan: "enterprise" },
              },
              ongoing: false,
            },
            {
              id: "s3",
              start_time: "2026-02-01T00:00:00.000Z",
              active_seconds: 120,
              distinct_id: "d3",
              start_url: "https://app.example.com/reports",
              person: {
                properties: { email: "target@example.com", plan: "enterprise" },
              },
              ongoing: false,
            },
          ],
          has_next: false,
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const results = await findRecordingsByQuery({
      apiKey: "key",
      projectId: "123",
      filters: {
        email: "target@example.com",
        urlContains: "checkout",
        minActiveSeconds: 60,
        startsAfter: "2026-01-15T00:00:00.000Z",
        startsBefore: "2026-01-31T23:59:59.000Z",
        properties: { plan: "enterprise" },
        limit: 1,
      },
    });

    expect(results.map((recording) => recording.id)).toEqual(["s2"]);
  });
});
