import type { Command } from "commander";
import {
  ensurePlaywrightChromiumInstalled,
  findRecordingById,
  findRecordingsByQuery,
  getRecordingUserEmail,
} from "../../connectors";
import {
  analyzeGroupById,
  analyzeQuery,
  analyzeUserByEmail,
  renderAndAnalyzeSessions,
} from "../analysis";
import { printJson } from "./helpers";
import {
  buildQueryFilters,
  collectOption,
  type QueryCommandOptions,
} from "./query-filters";
import { createReplayProgressRenderer } from "./replays-progress";
import {
  ensureReplayContext,
  printResult,
  type ReplayRunOptions,
  resolveSessionConcurrency,
  shouldEmitJson,
  withRenderLogMode,
} from "./runtime";

type ReplayQueryOptions = QueryCommandOptions &
  ReplayRunOptions & {
    dryRun?: boolean;
  };

function addReplayFilterOptions<T extends Command>(command: T): T {
  return command
    .option("--email <email>", "Filter by user email")
    .option("--group <groupId>", "Filter by group identifier")
    .option("--group-key <key>", "Group property key override")
    .option("--domain <domain>", "Filter URLs by domain (default from config)")
    .option("--all-domains", "Disable default domain filter")
    .option("--url <substring>", "Filter by URL substring")
    .option("--session-id <id>", "Filter by exact session ID")
    .option("--session-contains <substring>", "Filter by session ID substring")
    .option("--distinct-id <id>", "Filter by exact distinct_id")
    .option("--from <isoDate>", "Session start on/after ISO timestamp")
    .option("--to <isoDate>", "Session start on/before ISO timestamp")
    .option("--min-active <seconds>", "Minimum active seconds", Number)
    .option("--max-active <seconds>", "Maximum active seconds", Number)
    .option("--include-ongoing", "Include sessions still recording")
    .option("--require-person", "Require person profile on each session")
    .option(
      "--where <key=value>",
      "Exact person property filter (repeatable)",
      collectOption,
      []
    )
    .option("--limit <n>", "Limit number of sessions", Number);
}

export function registerReplaysCommand(program: Command): void {
  const replays = program
    .command("replays")
    .description("Run synchronous replay analysis flows");

  replays.addHelpText(
    "after",
    `
Examples:
  $ vesai replays session ph_abc123
  $ vesai replays user user@example.com
  $ vesai replays group acme-inc
  $ vesai replays query "checkout friction" --email user@example.com --min-active 30
  $ vesai replays list --group acme-inc --limit 50

Agent tips:
  - Use --dry-run to estimate runtime before analysis.
  - JSON output is default. Use --no-json for human-readable output.
  - Text query is literal search over replay/session metadata, not semantic intent.
`
  );

  replays
    .command("session <sessionId>")
    .description("Render and analyze one session replay synchronously")
    .option("--no-json", "Output human-readable text")
    .option("--verbose", "Show low-level render/debug logs")
    .addHelpText(
      "after",
      `
What this does:
  - Fetch one replay by session id.
  - Render replay events + video.
  - Analyze session quality and write markdown to workspace.

Examples:
  $ vesai replays session ph_abc123
  $ vesai replays session ph_abc123 --no-json
`
    )
    .action(
      async (
        sessionId: string,
        options: { json?: boolean; verbose?: boolean }
      ) => {
        const { config } = await ensureReplayContext();
        await ensurePlaywrightChromiumInstalled();

        const recording = await findRecordingById({
          host: config.posthog.host,
          apiKey: config.posthog.apiKey,
          projectId: config.posthog.projectId,
          sessionId,
        });

        if (!recording) {
          throw new Error(`Session ${sessionId} was not found in PostHog.`);
        }

        const progress = shouldEmitJson(options.json)
          ? null
          : createReplayProgressRenderer({
              label: "replays session",
            });

        try {
          const results = await withRenderLogMode(options.verbose, async () =>
            renderAndAnalyzeSessions({
              recordings: [recording],
              context: { config },
              concurrency: 1,
              onProgress: progress?.handle,
            })
          );

          const result = results[0]!;
          const output = {
            sessionId: result.recording.id,
            name: result.analysis.name,
            score: result.analysis.score,
            health: result.analysis.health,
            markdownPath: result.markdownPath,
            videoUri: result.render.videoUri,
            eventsUri: result.render.eventsUri,
          };

          if (shouldEmitJson(options.json)) {
            printJson(output);
            return;
          }

          console.log(`Session: ${output.sessionId}`);
          console.log(`Name: ${output.name}`);
          console.log(`Score: ${output.score}`);
          console.log(`Health: ${output.health}`);
          console.log(`Markdown: ${output.markdownPath}`);
          console.log(`Video: ${output.videoUri}`);
          console.log(`Events: ${output.eventsUri}`);
        } finally {
          progress?.close();
        }
      }
    );

  replays
    .command("user <email>")
    .description("Analyze a user across all matching replay sessions")
    .option(
      "--max-concurrent <n>",
      "Max concurrent session pipelines for this run",
      Number
    )
    .option("--no-json", "Output human-readable text")
    .option("--verbose", "Show low-level render/debug logs")
    .addHelpText(
      "after",
      `
User analysis contract:
  - Analyze each session for this user first.
  - Then run one aggregate user inference across all sessions + metadata.

Learning flow:
  1) Preview scope: vesai replays list --email user@example.com --limit 10
  2) Estimate runtime: vesai replays query --email user@example.com --dry-run
  3) Run full analysis: vesai replays user user@example.com
`
    )
    .action(async (email: string, options: ReplayRunOptions) => {
      const { config } = await ensureReplayContext();
      await ensurePlaywrightChromiumInstalled();

      const progress = shouldEmitJson(options.json)
        ? null
        : createReplayProgressRenderer({
            label: `replays user ${email}`,
          });

      try {
        const result = await withRenderLogMode(options.verbose, async () =>
          analyzeUserByEmail({
            email,
            context: { config },
            sessionConcurrency: resolveSessionConcurrency(options, config),
            onSessionProgress: progress?.handle,
          })
        );

        const output = {
          email: result.email,
          sessionCount: result.sessionCount,
          averageSessionScore: result.averageSessionScore,
          userScore: result.userScore,
          markdownPath: result.markdownPath,
        };

        if (shouldEmitJson(options.json)) {
          printJson(output);
          return;
        }

        console.log(`User: ${output.email}`);
        console.log(`Sessions: ${output.sessionCount}`);
        console.log(`Average session score: ${output.averageSessionScore}`);
        console.log(`User score: ${output.userScore}`);
        console.log(`Markdown: ${output.markdownPath}`);
      } finally {
        progress?.close();
      }
    });

  replays
    .command("group <groupId>")
    .description("Analyze one group via replay sessions and user rollups")
    .option(
      "--max-concurrent <n>",
      "Max concurrent session pipelines for each user",
      Number
    )
    .option("--no-json", "Output human-readable text")
    .option("--verbose", "Show low-level render/debug logs")
    .addHelpText(
      "after",
      `
What this does:
  - Resolve users in the group.
  - Analyze each user from replay evidence.
  - Produce one group summary and markdown artifact.

Examples:
  $ vesai replays group acme
  $ vesai replays group acme --max-concurrent 6
`
    )
    .action(async (groupId: string, options: ReplayRunOptions) => {
      const { config } = await ensureReplayContext();
      await ensurePlaywrightChromiumInstalled();

      const progress = shouldEmitJson(options.json)
        ? null
        : createReplayProgressRenderer({
            label: `replays group ${groupId}`,
          });

      try {
        const result = await withRenderLogMode(options.verbose, async () =>
          analyzeGroupById({
            groupId,
            context: { config },
            sessionConcurrency: resolveSessionConcurrency(options, config),
            onSessionProgress: progress?.handle,
          })
        );

        if (shouldEmitJson(options.json)) {
          printJson(result);
          return;
        }

        console.log(`Group: ${result.groupId}`);
        console.log(`Users analyzed: ${result.usersAnalyzed}`);
        console.log(`Score: ${result.score}`);
        console.log(`Markdown: ${result.markdownPath}`);
      } finally {
        progress?.close();
      }
    });

  addReplayFilterOptions(
    replays
      .command("query [text]")
      .description("Analyze replays matching text + structured filters")
  )
    .option(
      "--max-concurrent <n>",
      "Max concurrent session pipelines for this run",
      Number
    )
    .option(
      "--dry-run",
      "Resolve matching sessions and estimate workload without AI analysis"
    )
    .option("--verbose", "Show low-level render/debug logs")
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Examples:
  $ vesai replays query "checkout friction"
  $ vesai replays query "checkout" --url /checkout --min-active 30 --where plan=enterprise
  $ vesai replays query --email jane@acme.com --from 2026-01-01 --to 2026-01-31
  $ vesai replays query --group acme --group-key company_id --where plan=enterprise
  $ vesai replays query --url /checkout --min-active 45 --limit 25
  $ vesai replays query --group acme --dry-run

Filter strategy for "checkout friction":
  - Text query is literal search over replay/session metadata.
  - Start with --url /checkout or a checkout event/property filter via --where.
  - Add --min-active to prioritize high-effort sessions.
  - Use --from/--to to isolate a release window.
`
    )
    .action(
      async (queryText: string | undefined, options: ReplayQueryOptions) => {
        const { config } = await ensureReplayContext();

        const filters = buildQueryFilters({
          text: queryText,
          options,
          config,
        });

        if (options.dryRun) {
          const recordings = await findRecordingsByQuery({
            host: config.posthog.host,
            apiKey: config.posthog.apiKey,
            projectId: config.posthog.projectId,
            query: queryText,
            filters,
            domainFilter: config.posthog.domainFilter,
          });

          const concurrency = resolveSessionConcurrency(options, config);
          const totalActiveSeconds = recordings.reduce(
            (sum, recording) =>
              sum + Math.max(0, Number(recording.active_seconds ?? 0)),
            0
          );
          const estimatedRenderSeconds = recordings.reduce((sum, recording) => {
            const activeSeconds = Math.max(
              1,
              Number(recording.active_seconds ?? 0)
            );
            return sum + Math.max(25, Math.round(activeSeconds * 1.65 + 24));
          }, 0);

          const estimatedWallClockSeconds =
            recordings.length > 0
              ? Math.ceil(estimatedRenderSeconds / Math.max(1, concurrency))
              : 0;

          const sample = recordings.slice(0, 20).map((recording) => ({
            sessionId: recording.id,
            startTime: recording.start_time ?? null,
            activeSeconds: recording.active_seconds ?? 0,
            url: recording.start_url ?? null,
            email: getRecordingUserEmail(recording),
          }));

          const output = {
            mode: "dry-run",
            query: queryText || "",
            filters,
            matchedSessions: recordings.length,
            totalActiveSeconds,
            estimatedRenderSeconds,
            estimatedWallClockSeconds,
            recommendedMaxConcurrent: concurrency,
            sample,
          };

          printResult(output, shouldEmitJson(options.json));
          return;
        }

        await ensurePlaywrightChromiumInstalled();

        const progress = shouldEmitJson(options.json)
          ? null
          : createReplayProgressRenderer({
              label: "replays query",
            });

        try {
          const result = await withRenderLogMode(options.verbose, async () =>
            analyzeQuery({
              query: queryText,
              filters,
              context: { config },
              sessionConcurrency: resolveSessionConcurrency(options, config),
              onSessionProgress: progress?.handle,
            })
          );

          if (shouldEmitJson(options.json)) {
            printJson(result);
            return;
          }

          console.log(`Query: ${result.query || "<filters-only>"}`);
          console.log(`Sessions analyzed: ${result.sessionCount}`);
          console.log(`Average score: ${result.averageScore}`);
        } finally {
          progress?.close();
        }
      }
    );

  addReplayFilterOptions(
    replays
      .command("list [text]")
      .description(
        "List replay sessions matching filters without running AI analysis"
      )
  )
    .option("--no-json", "Output human-readable text")
    .addHelpText(
      "after",
      `
Use this to discover candidates before expensive analysis.

Examples:
  $ vesai replays list --email user@example.com --limit 25
  $ vesai replays list "checkout" --url /checkout --min-active 30

Next step:
  - Use the same filters with \`vesai replays query\` to run AI analysis.
`
    )
    .action(
      async (queryText: string | undefined, options: ReplayQueryOptions) => {
        const { config } = await ensureReplayContext();

        const effectiveOptions: QueryCommandOptions = {
          ...options,
          limit: options.limit ?? 50,
        };

        const filters = buildQueryFilters({
          text: queryText,
          options: effectiveOptions,
          config,
        });

        const recordings = await findRecordingsByQuery({
          host: config.posthog.host,
          apiKey: config.posthog.apiKey,
          projectId: config.posthog.projectId,
          query: queryText,
          filters,
          domainFilter: config.posthog.domainFilter,
        });

        const rows = recordings.map((recording) => ({
          id: recording.id,
          start_time: recording.start_time,
          end_time: recording.end_time,
          active_seconds: recording.active_seconds,
          start_url: recording.start_url,
          distinct_id: recording.distinct_id,
          email: getRecordingUserEmail(recording),
          ongoing: recording.ongoing ?? false,
        }));

        if (shouldEmitJson(options.json)) {
          printJson({ count: rows.length, rows });
          return;
        }

        console.log(`Matched sessions: ${rows.length}`);
        printJson(rows);
      }
    );
}
