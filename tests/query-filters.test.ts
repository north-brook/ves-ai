import { describe, expect, it } from "bun:test";
import {
  buildQueryFilters,
  parseWhereAssignments,
} from "../cli/commands/query-filters";
import { makeConfig } from "./helpers";

describe("query filter parser", () => {
  it("builds filters with config defaults", () => {
    const config = makeConfig({
      posthog: {
        domainFilter: "app.example.com",
        groupKey: "company_id",
      },
    });

    const filters = buildQueryFilters({
      text: "checkout",
      config,
      options: {
        group: "acme",
      },
    });

    expect(filters.text).toBe("checkout");
    expect(filters.domain).toBe("app.example.com");
    expect(filters.groupId).toBe("acme");
    expect(filters.groupKey).toBe("company_id");
  });

  it("supports all-domains and where parsing", () => {
    const config = makeConfig();
    const filters = buildQueryFilters({
      text: undefined,
      config,
      options: {
        allDomains: true,
        where: ["plan=enterprise", "region=us"],
        email: "user@example.com",
      },
    });

    expect(filters.domain).toBeUndefined();
    expect(filters.email).toBe("user@example.com");
    expect(filters.properties).toEqual({
      plan: "enterprise",
      region: "us",
    });
  });

  it("validates ranges and empty query", () => {
    const config = makeConfig();

    expect(() =>
      buildQueryFilters({
        text: undefined,
        config,
        options: {},
      })
    ).toThrow("No query filters provided");

    expect(() =>
      buildQueryFilters({
        text: "checkout",
        config,
        options: {
          minActive: 100,
          maxActive: 50,
        },
      })
    ).toThrow("--min-active cannot be greater than --max-active");

    expect(() =>
      buildQueryFilters({
        text: "checkout",
        config,
        options: {
          limit: 0,
        },
      })
    ).toThrow("--limit must be a positive integer");
  });

  it("parses and validates where assignments", () => {
    expect(parseWhereAssignments(["plan=enterprise"])).toEqual({
      plan: "enterprise",
    });

    expect(() => parseWhereAssignments(["broken"])).toThrow(
      'Invalid --where value "broken"'
    );
  });
});
