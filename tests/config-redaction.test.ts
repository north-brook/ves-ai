import { describe, expect, it } from "bun:test";
import { redactConfigSecrets } from "../cli/commands/helpers";
import { makeConfig } from "./helpers";

describe("config redaction", () => {
  it("redacts PostHog API key for safe display", () => {
    const config = makeConfig({
      posthog: {
        apiKey: "phx_abcdefghijklmnopqrstuvwxyz123456",
      },
    });

    const redacted = redactConfigSecrets(config);
    expect(redacted.posthog.apiKey).toBe("phx_...3456");
    expect(config.posthog.apiKey).toBe("phx_abcdefghijklmnopqrstuvwxyz123456");
  });
});
