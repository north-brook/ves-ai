import { describe, expect, it } from "bun:test";
import { getVesaiPaths, resolveVesaiHome } from "../config/paths";

describe("paths", () => {
  it("resolves VESAI_HOME override", () => {
    const previous = process.env.VESAI_HOME;
    process.env.VESAI_HOME = "/tmp/custom-vesai-home";

    const resolved = resolveVesaiHome();
    const paths = getVesaiPaths(resolved);

    expect(resolved).toBe("/tmp/custom-vesai-home");
    expect(paths.configFile).toBe("/tmp/custom-vesai-home/vesai.json");
    expect(paths.sessionsDir).toBe("/tmp/custom-vesai-home/workspace/sessions");

    if (previous === undefined) {
      delete process.env.VESAI_HOME;
    } else {
      process.env.VESAI_HOME = previous;
    }
  });
});
