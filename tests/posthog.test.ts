import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  findRecordingsByGroupId,
  findRecordingsByUserEmail,
  getRecordingUserEmail,
  listAllRecordings,
} from "../connectors/posthog";

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

  it("filters by group id", async () => {
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
            { id: "g2", person: { properties: { company_id: "acme" } } },
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

    expect(byGroup.length).toBe(2);
  });
});
