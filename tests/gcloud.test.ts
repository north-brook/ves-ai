import { afterEach, describe, expect, it, mock } from "bun:test";

afterEach(() => {
  mock.restore();
});

describe("gcloud connector", () => {
  it("parses gcloud command outputs and bucket provisioning flow", async () => {
    const runCommand = mock(async (_command: string, args: string[]) => {
      const commandLine = args.join(" ");

      if (commandLine === "--version") {
        return { stdout: "Google Cloud SDK", stderr: "", exitCode: 0 };
      }

      if (commandLine.includes("auth list")) {
        return { stdout: "dev@example.com", stderr: "", exitCode: 0 };
      }

      if (commandLine.includes("config get-value project")) {
        return { stdout: "demo-project", stderr: "", exitCode: 0 };
      }

      if (commandLine.includes("application-default print-access-token")) {
        return { stdout: "token", stderr: "", exitCode: 0 };
      }

      if (commandLine.includes("storage buckets list")) {
        return {
          stdout: "gs://alpha\ngs://beta",
          stderr: "",
          exitCode: 0,
        };
      }

      if (commandLine.includes("storage buckets describe")) {
        return { stdout: "", stderr: "not found", exitCode: 1 };
      }

      return { stdout: "", stderr: "", exitCode: 0 };
    });

    const runCommandOrThrow = mock(async () => {
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    mock.module("../packages/connectors/src/shell", () => ({
      runCommand,
      runCommandOrThrow,
    }));

    const gcloud = await import("../packages/connectors/src/gcloud");

    expect(await gcloud.isGcloudInstalled()).toBe(true);
    expect(await gcloud.getActiveGcloudAccount()).toBe("dev@example.com");
    expect(await gcloud.getActiveGcloudProject()).toBe("demo-project");
    expect(await gcloud.hasApplicationDefaultCredentials()).toBe(true);
    expect(await gcloud.listBuckets("demo-project")).toEqual(["alpha", "beta"]);

    await gcloud.ensureRequiredApis("demo-project");
    expect(runCommandOrThrow).toHaveBeenCalled();

    await gcloud.ensureBucket({
      bucket: "gs://new-bucket",
      projectId: "demo-project",
      location: "US",
    });

    expect(runCommandOrThrow).toHaveBeenCalledTimes(2);
    expect(runCommandOrThrow).toHaveBeenNthCalledWith(2, "gcloud", [
      "storage",
      "buckets",
      "create",
      "gs://new-bucket",
      "--project",
      "demo-project",
      "--location",
      "US",
      "--uniform-bucket-level-access",
    ]);
    expect(gcloud.normalizeBucketLocation(" us ")).toBe("US");
    expect(gcloud.normalizeBucketLocation("Eu")).toBe("EU");
    expect(gcloud.normalizeBucketLocation("us-central1")).toBe("us-central1");
  });

  it("shows friendly error for invalid bucket location constraint", async () => {
    const runCommand = mock(async (_command: string, args: string[]) => {
      const commandLine = args.join(" ");
      if (commandLine.includes("storage buckets describe")) {
        return { stdout: "", stderr: "not found", exitCode: 1 };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    const runCommandOrThrow = mock(async () => {
      throw new Error(
        "gcloud storage buckets create failed: HTTPError 400: The specified location constraint is not valid."
      );
    });

    mock.module("../packages/connectors/src/shell", () => ({
      runCommand,
      runCommandOrThrow,
    }));

    const gcloud = await import("../packages/connectors/src/gcloud");

    await expect(
      gcloud.ensureBucket({
        bucket: "gs://vesai-test",
        projectId: "demo-project",
        location: "us-central4",
      })
    ).rejects.toThrow(
      "Invalid GCS bucket location 'us-central4'. Use US, EU, ASIA, or a valid regional location such as us-central1."
    );
  });
});
