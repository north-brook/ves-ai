import { PostHogRecording } from "@/workflows/sync/types";
import { Storage } from "@google-cloud/storage";
import { expect, test } from "@playwright/test";

test("cloud replay service", async ({ request }) => {
  // 10 min timeout
  test.setTimeout(10 * 60 * 1000);

  const posthogKey = process.env.QA_POSTHOG_KEY;
  const posthogProject = process.env.QA_POSTHOG_PROJECT;
  const cloudServiceUrl = process.env.CLOUD_URL || "http://localhost:8080";
  const gcpProjectId = process.env.GCP_PROJECT_ID;
  const gcpClientEmail = process.env.GCP_CLIENT_EMAIL;
  const gcpPrivateKey = process.env.GCP_PRIVATE_KEY;

  // Initialize storage matching lib/storage.ts
  const storage = new Storage({
    projectId: gcpProjectId,
    credentials: {
      client_email: gcpClientEmail,
      private_key: gcpPrivateKey,
    },
  });
  const bucketName = "ves.ai";

  // Store selected recordings to run tests against
  const selectedRecordings: { label: string; recording: PostHogRecording }[] =
    [];

  await test.step("setup environment", async () => {
    console.log("🔧 Configuration:");
    console.log(`  - Cloud Service URL: ${cloudServiceUrl}`);
    console.log(`  - PostHog Project: ${posthogProject}`);
    console.log(`  - GCP Project ID: ${gcpProjectId}`);
    console.log(`  - GCP Client Email: ${gcpClientEmail}`);

    if (
      !posthogKey ||
      !posthogProject ||
      !gcpProjectId ||
      !gcpClientEmail ||
      !gcpPrivateKey
    ) {
      console.log("❌ Missing required environment variables");
      test.skip(
        true,
        "QA_POSTHOG_KEY, QA_POSTHOG_PROJECT, GCP_PROJECT_ID, GCP_CLIENT_EMAIL, and GCP_PRIVATE_KEY env vars are required",
      );
    }
  });

  let recordings: PostHogRecording[] = [];

  await test.step("fetch recordings from PostHog", async () => {
    console.log("📡 Fetching recordings from PostHog...");

    // Fetch recent recordings from PostHog
    const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]; // 7 days ago
    console.log(`📅 Date range: from ${dateFrom} to today`);

    const recordingsResponse = await request.get(
      `https://us.posthog.com/api/projects/${posthogProject}/session_recordings?limit=100&date_from=${dateFrom}`,
      {
        headers: {
          Authorization: `Bearer ${posthogKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    expect(recordingsResponse.ok()).toBeTruthy();
    const recordingsData = await recordingsResponse.json();
    recordings = recordingsData.results || [];

    console.log(`📊 Found ${recordings.length} total recordings on first page`);
  });

  await test.step("select recordings", async () => {
    // Helper to find a recording matching criteria
    const findRecording = (
      criteria: (r: any) => boolean,
      excludeIds: Set<string>,
    ) => {
      return recordings.find((r: any) => criteria(r) && !excludeIds.has(r.id));
    };

    const usedIds = new Set<string>();

    // 1. Roughly equal duration (active ~= total)
    // Tolerance of 10% difference
    const equalDurationRec = findRecording((r) => {
      return (
        r.active_seconds >= 30 &&
        r.active_seconds <= 360 &&
        Math.abs(r.recording_duration - r.active_seconds) <
          r.active_seconds * 0.1
      );
    }, usedIds);

    if (equalDurationRec) {
      selectedRecordings.push({
        label: "Equal Duration",
        recording: equalDurationRec,
      });
      usedIds.add(equalDurationRec.id);
    }

    // 2. Larger total duration (total > active * 1.5)
    const largerDurationRec = findRecording((r) => {
      return (
        r.active_seconds >= 60 &&
        r.active_seconds <= 360 &&
        r.recording_duration > r.active_seconds * 1.5 &&
        r.recording_duration < r.active_seconds * 3
      );
    }, usedIds);

    if (largerDurationRec) {
      selectedRecordings.push({
        label: "Larger Total",
        recording: largerDurationRec,
      });
      usedIds.add(largerDurationRec.id);
    }

    // 3. Significantly larger total duration (total > active * 5)
    const hugeDurationRec = findRecording((r) => {
      return (
        r.active_seconds >= 60 &&
        r.active_seconds <= 360 &&
        r.recording_duration > r.active_seconds * 5
      );
    }, usedIds);

    if (hugeDurationRec) {
      selectedRecordings.push({
        label: "Huge Total",
        recording: hugeDurationRec,
      });
      usedIds.add(hugeDurationRec.id);
    }

    if (selectedRecordings.length === 0) {
      console.log("⚠️ No suitable recordings found between 30 and 360 seconds");
      test.skip(true, "No suitable recordings found");
      return;
    }

    console.log(
      `✅ Selected ${selectedRecordings.length} recordings for testing`,
    );
    selectedRecordings.forEach(({ label, recording }) =>
      console.log(
        `  📹 [${label}] ${recording.id} (Active: ${recording.active_seconds}s, Total: ${recording.recording_duration}s)`,
      ),
    );
  });

  console.log("🚀 Starting parallel processing...");
  const summary: any[] = [];

  // Run all recordings in parallel promises, but wrap each in a test.step
  await test.step("process recordings in parallel", async () => {
    await Promise.all(
      selectedRecordings.map(async ({ label, recording }) => {
        const processResponse = await request.post(
          `${cloudServiceUrl}/process`,
          {
            data: {
              source_type: "posthog",
              source_host: "https://us.posthog.com",
              source_key: posthogKey,
              source_project: posthogProject,
              project_id: "qa",
              session_id: recording.id,
              external_id: recording.id,
              active_duration: recording.active_seconds,
            },
            timeout: 480000, // 8 minutes timeout
          },
        );

        // Use soft assertions so one failure doesn't stop the others
        expect
          .soft(
            processResponse.ok(),
            `Failed to process recording ${recording.id}`,
          )
          .toBeTruthy();

        if (!processResponse.ok()) {
          console.log(`❌ [${label}] Failed: ${processResponse.status()}`);
          return;
        }

        const json = await processResponse.json();

        if (!json.success) {
          console.log(
            `❌ [${label}] Cloud service reported failure: ${JSON.stringify(
              json,
            )}`,
          );
        }

        expect
          .soft(json.success, `Success flag false for ${recording.id}`)
          .toBe(true);

        // Verify response structure
        expect.soft(json, `Missing response object`).toHaveProperty("response");
        if (json.response) {
          expect
            .soft(json.response, `Nested success flag`)
            .toHaveProperty("success", true);
          expect
            .soft(json.response, `Missing video_duration`)
            .toHaveProperty("video_duration");

          const videoDuration = json.response.video_duration;
          const activeDuration = recording.active_seconds;
          const diff = videoDuration - activeDuration;

          // Generate signed URL
          let signedUrl = "N/A";
          try {
            const filePath = `qa/${recording.id}.webm`;
            [signedUrl] = await storage
              .bucket(bucketName)
              .file(filePath)
              .getSignedUrl({
                version: "v4",
                action: "read",
                expires: Date.now() + 15 * 60 * 1000, // 15 minutes
              });
          } catch (e) {
            console.log(`⚠️ Failed to generate signed URL: ${e}`);
          }

          const deltaPercent = ((diff / activeDuration) * 100).toFixed(1) + "%";

          summary.push({
            Type: label,
            "Total Duration": recording.recording_duration,
            "Active Duration": activeDuration,
            "Video Duration": videoDuration,
            Delta: deltaPercent,
            url: signedUrl,
          });

          // Verify video duration is not more than 30% longer than active duration
          const minDuration = activeDuration * 1;
          const maxDuration = activeDuration * 1.3;

          expect
            .soft(videoDuration, `Duration too short for ${recording.id}`)
            .toBeGreaterThanOrEqual(minDuration);
          expect
            .soft(videoDuration, `Duration too long for ${recording.id}`)
            .toBeLessThanOrEqual(maxDuration);
        }
      }),
    );
  });

  console.log("\n🎉 All recordings processed!");
  if (summary.length > 0) {
    const tableView = summary.map(({ url, ...rest }) => rest);
    console.table(tableView);

    console.log("\n🔗 Signed URLs:");
    summary.forEach((item) => {
      console.log(`  [${item.Type}] ${item.url}`);
    });
  }
});
