#!/usr/bin/env node
import { spawn } from "node:child_process";
import { open, readFile as readFileFs } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { kill } from "node:process";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import {
  ensureVesaiDirectories,
  getVesaiPaths,
  loadConfig,
  requireConfig,
  resolveVesaiHome,
  updateConfig,
  type VesaiConfig,
} from "../../packages/config/src";
import {
  ensurePlaywrightChromiumInstalled,
  executeSqlQuery,
  findRecordingById,
  findRecordingsByQuery,
  generateHogQLFromQuestion,
  getErrorDetails,
  getPlaywrightChromiumExecutablePath,
  isPlaywrightChromiumInstalled,
  listErrors,
  listEventDefinitions,
  listLogAttributes,
  listLogAttributeValues,
  listPropertyDefinitions,
  queryLogs,
  readDataSchema,
  readDataWarehouseSchema,
  runInsightQuery,
} from "../../packages/connectors/src";
import {
  analyzeGroupById,
  analyzeQuery,
  analyzeUserByEmail,
  renderAndAnalyzeSessions,
  startDaemon,
} from "../../packages/core/src";
import { getDaemonStatus, printJson } from "./commands/helpers";
import {
  buildQueryFilters,
  collectOption,
  type QueryCommandOptions,
} from "./commands/query-filters";
import {
  type QuickstartCommandOptions,
  runQuickstartCli,
} from "./commands/quickstart";
import { createReplayProgressRenderer } from "./commands/replays-progress";

const DAEMON_START_TIMEOUT_MS = 5000;
const DAEMON_START_POLL_MS = 100;
const CLI_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(CLI_DIR, "..", "..");
const DAEMON_ENTRYPOINT = resolve(REPO_ROOT, "daemon/src/index.ts");

type ReplayRunOptions = {
  json?: boolean;
  maxConcurrent?: number;
};

type ReplayQueryOptions = QueryCommandOptions & ReplayRunOptions;

type InsightRunOptions = {
  queryJson?: string;
  queryFile?: string;
  hogql?: string;
  json?: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toPositiveInt(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!(Number.isInteger(parsed) && parsed > 0)) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

async function waitForDaemonToBeRunning(
  timeoutMs = DAEMON_START_TIMEOUT_MS
): Promise<{ running: boolean; pid?: number }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await getDaemonStatus();
    if (status.running && status.pid) {
      return status;
    }
    await sleep(DAEMON_START_POLL_MS);
  }
  return getDaemonStatus();
}

async function startDaemonInBackground(): Promise<{
  pid: number;
  logFile: string;
}> {
  const paths = getVesaiPaths();
  const logFile = `${paths.logsDir}/daemon.log`;
  const logHandle = await open(logFile, "a");

  try {
    const child = spawn(process.execPath, [DAEMON_ENTRYPOINT], {
      cwd: REPO_ROOT,
      detached: true,
      env: process.env,
      stdio: ["ignore", logHandle.fd, logHandle.fd],
    });

    child.unref();
  } finally {
    await logHandle.close();
  }

  const status = await waitForDaemonToBeRunning();
  if (!(status.running && status.pid)) {
    throw new Error(`Daemon failed to start. Check logs at ${logFile}`);
  }

  return { pid: status.pid, logFile };
}

async function ensureReplayContext(): Promise<{ config: VesaiConfig }> {
  await ensureVesaiDirectories();
  const config = await requireConfig();
  return { config };
}

function resolveSessionConcurrency(
  options: ReplayRunOptions,
  config: VesaiConfig
): number {
  const override = toPositiveInt(options.maxConcurrent, "--max-concurrent");
  return override ?? config.runtime.maxConcurrentRenders;
}

function printResult(value: unknown, json = false): void {
  if (json) {
    printJson(value);
    return;
  }

  if (typeof value === "string") {
    console.log(value);
    return;
  }

  console.log(JSON.stringify(value, null, 2));
}

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

async function parseInsightQueryInput(
  options: InsightRunOptions
): Promise<Record<string, unknown>> {
  const candidates = [
    options.queryJson,
    options.queryFile,
    options.hogql,
  ].filter(Boolean);
  if (candidates.length !== 1) {
    throw new Error(
      "Provide exactly one of --query-json, --query-file, or --hogql."
    );
  }

  if (options.hogql) {
    return {
      kind: "DataVisualizationNode",
      source: {
        kind: "HogQLQuery",
        query: options.hogql,
      },
    };
  }

  if (options.queryFile) {
    const raw = await readFileFs(options.queryFile, "utf8");
    const parsed = JSON.parse(raw);
    if (!(parsed && typeof parsed === "object")) {
      throw new Error("--query-file must contain a JSON object.");
    }
    return parsed as Record<string, unknown>;
  }

  const parsed = JSON.parse(options.queryJson || "{}");
  if (!(parsed && typeof parsed === "object")) {
    throw new Error("--query-json must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

const program = new Command();

program
  .name("vesai")
  .description("VESAI local-first CLI for replay analysis + PostHog analytics")
  .version("0.1.0");
program.showSuggestionAfterError(true);
program.showHelpAfterError(
  "\nRun with --help to see command usage and examples."
);
program.addHelpText(
  "after",
  `
Quickstart:
  $ vesai quickstart

Replay Workflows:
  $ vesai replays user bryce@lenny.com
  $ vesai replays query "checkout friction" --from 2026-01-01 --to 2026-01-31

Analytics Workflows:
  $ vesai events --search checkout
  $ vesai insights hogql "weekly active users by plan"
  $ vesai insights sql "SELECT event, count() FROM events GROUP BY event LIMIT 20"
`
);

program
  .command("quickstart")
  .description("Run CLI setup wizard")
  .option("--posthog-host <url>", "PostHog host URL")
  .option("--posthog-api-key <key>", "PostHog user API key")
  .option("--posthog-project-id <id>", "PostHog project id")
  .option("--posthog-group-key <key>", "PostHog group key")
  .option("--domain-filter <domain>", "Replay domain filter")
  .option("--gcloud-project-id <id>", "Google Cloud project id override")
  .option("--vertex-location <location>", "Vertex AI location")
  .option("--bucket-location <location>", "GCS bucket location")
  .option("--bucket <name>", "GCS bucket name")
  .option(
    "--max-concurrent-renders <n>",
    "Max concurrent renders (positive integer)",
    Number
  )
  .option(
    "--product-description <text>",
    "Product description for analysis context"
  )
  .option("-y, --yes", "Use defaults where possible without prompting")
  .option(
    "--non-interactive",
    "Disable prompts and require flags for required fields"
  )
  .addHelpText(
    "after",
    `
Examples:
  $ vesai quickstart
  $ vesai quickstart --yes --posthog-api-key phx_... --posthog-project-id 123 --domain-filter app.example.com --max-concurrent-renders 8 --product-description "B2B SaaS for..."
  $ vesai quickstart --non-interactive --posthog-api-key phx_... --posthog-project-id 123 --posthog-group-key company_id --domain-filter app.example.com --product-description "B2B SaaS for..."
`
  )
  .action(async (options: QuickstartCommandOptions) => {
    await ensureVesaiDirectories();
    await runQuickstartCli(options);
  });

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
`
);

replays
  .command("session <sessionId>")
  .description("Render and analyze one session replay synchronously")
  .option("--json", "Output JSON")
  .action(async (sessionId: string, options: { json?: boolean }) => {
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

    const progress = createReplayProgressRenderer({
      label: "replays session",
    });

    try {
      const results = await renderAndAnalyzeSessions({
        recordings: [recording],
        context: { config },
        concurrency: 1,
        onProgress: progress.handle,
      });

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

      if (options.json) {
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
      progress.close();
    }
  });

replays
  .command("user <email>")
  .description("Analyze a user across all matching replay sessions")
  .option(
    "--max-concurrent <n>",
    "Max concurrent session pipelines for this run",
    Number
  )
  .option("--json", "Output JSON")
  .action(async (email: string, options: ReplayRunOptions) => {
    const { config } = await ensureReplayContext();
    await ensurePlaywrightChromiumInstalled();

    const progress = createReplayProgressRenderer({
      label: `replays user ${email}`,
    });

    try {
      const result = await analyzeUserByEmail({
        email,
        context: { config },
        sessionConcurrency: resolveSessionConcurrency(options, config),
        onSessionProgress: progress.handle,
      });

      const output = {
        email: result.email,
        sessionCount: result.sessionCount,
        averageSessionScore: result.averageSessionScore,
        userScore: result.userScore,
        markdownPath: result.markdownPath,
      };

      if (options.json) {
        printJson(output);
        return;
      }

      console.log(`User: ${output.email}`);
      console.log(`Sessions: ${output.sessionCount}`);
      console.log(`Average session score: ${output.averageSessionScore}`);
      console.log(`User score: ${output.userScore}`);
      console.log(`Markdown: ${output.markdownPath}`);
    } finally {
      progress.close();
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
  .option("--json", "Output JSON")
  .action(async (groupId: string, options: ReplayRunOptions) => {
    const { config } = await ensureReplayContext();
    await ensurePlaywrightChromiumInstalled();

    const progress = createReplayProgressRenderer({
      label: `replays group ${groupId}`,
    });

    try {
      const result = await analyzeGroupById({
        groupId,
        context: { config },
        sessionConcurrency: resolveSessionConcurrency(options, config),
        onSessionProgress: progress.handle,
      });

      if (options.json) {
        printJson(result);
        return;
      }

      console.log(`Group: ${result.groupId}`);
      console.log(`Users analyzed: ${result.usersAnalyzed}`);
      console.log(`Score: ${result.score}`);
      console.log(`Markdown: ${result.markdownPath}`);
    } finally {
      progress.close();
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
  .option("--json", "Output JSON")
  .addHelpText(
    "after",
    `
Examples:
  $ vesai replays query "checkout friction"
  $ vesai replays query --email jane@acme.com --from 2026-01-01 --to 2026-01-31
  $ vesai replays query --group acme --group-key company_id --where plan=enterprise
  $ vesai replays query --url /checkout --min-active 45 --limit 25
`
  )
  .action(async (text: string | undefined, options: ReplayQueryOptions) => {
    const { config } = await ensureReplayContext();
    await ensurePlaywrightChromiumInstalled();

    const filters = buildQueryFilters({
      text,
      options,
      config,
    });

    const progress = createReplayProgressRenderer({
      label: "replays query",
    });

    try {
      const result = await analyzeQuery({
        query: text,
        filters,
        context: { config },
        sessionConcurrency: resolveSessionConcurrency(options, config),
        onSessionProgress: progress.handle,
      });

      if (options.json) {
        printJson(result);
        return;
      }

      console.log(`Query: ${result.query || "<filters-only>"}`);
      console.log(`Sessions analyzed: ${result.sessionCount}`);
      console.log(`Average score: ${result.averageScore}`);
    } finally {
      progress.close();
    }
  });

addReplayFilterOptions(
  replays
    .command("list [text]")
    .description(
      "List replay sessions matching filters without running AI analysis"
    )
)
  .option("--json", "Output JSON")
  .action(async (text: string | undefined, options: ReplayQueryOptions) => {
    const { config } = await ensureReplayContext();

    const effectiveOptions: QueryCommandOptions = {
      ...options,
      limit: options.limit ?? 50,
    };

    const filters = buildQueryFilters({
      text,
      options: effectiveOptions,
      config,
    });

    const recordings = await findRecordingsByQuery({
      host: config.posthog.host,
      apiKey: config.posthog.apiKey,
      projectId: config.posthog.projectId,
      query: text,
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
      email: recording.person?.properties
        ? (recording.person.properties.email as string | undefined) ||
          (recording.person.properties.$email as string | undefined) ||
          null
        : null,
      ongoing: recording.ongoing ?? false,
    }));

    if (options.json) {
      printJson({ count: rows.length, rows });
      return;
    }

    console.log(`Matched sessions: ${rows.length}`);
    printJson(rows);
  });

program
  .command("events")
  .description("List PostHog event definitions (MCP-compatible)")
  .option("--search <text>", "Search by event name")
  .option("--limit <n>", "Limit number of events", Number)
  .option("--offset <n>", "Pagination offset", Number)
  .option("--json", "Output JSON")
  .action(
    async (options: {
      search?: string;
      limit?: number;
      offset?: number;
      json?: boolean;
    }) => {
      const config = await requireConfig();
      const events = await listEventDefinitions({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        search: options.search,
        limit: options.limit,
        offset: options.offset,
      });

      if (options.json) {
        printJson(events);
        return;
      }

      console.log(`Events: ${events.length}`);
      printJson(events);
    }
  );

program
  .command("properties")
  .description("List PostHog property definitions (MCP-compatible)")
  .requiredOption("--type <type>", "Property type: event|person")
  .option("--event-name <name>", "Event name (required when --type event)")
  .option("--include-predefined", "Include predefined/system properties")
  .option("--limit <n>", "Limit number of properties", Number)
  .option("--offset <n>", "Pagination offset", Number)
  .option("--json", "Output JSON")
  .action(
    async (options: {
      type: string;
      eventName?: string;
      includePredefined?: boolean;
      limit?: number;
      offset?: number;
      json?: boolean;
    }) => {
      const type = options.type === "person" ? "person" : "event";
      if (type === "event" && !options.eventName) {
        throw new Error("--event-name is required when --type event.");
      }

      const config = await requireConfig();
      const properties = await listPropertyDefinitions({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        type,
        eventName: options.eventName,
        includePredefinedProperties: options.includePredefined,
        limit: options.limit,
        offset: options.offset,
      });

      if (options.json) {
        printJson(properties);
        return;
      }

      console.log(`Properties (${type}): ${properties.length}`);
      printJson(properties);
    }
  );

const schema = program
  .command("schema")
  .description("Inspect PostHog data schemas via MCP-backed APIs");

schema
  .command("data [query]")
  .description("Read PostHog event/property taxonomy")
  .option("--json", "Output JSON")
  .action(async (query: string | undefined, options: { json?: boolean }) => {
    const config = await requireConfig();
    const result = await readDataSchema({
      host: config.posthog.host,
      apiKey: config.posthog.apiKey,
      projectId: config.posthog.projectId,
      query,
    });

    printResult(result, options.json);
  });

schema
  .command("warehouse")
  .description("Read PostHog warehouse/session/person schema information")
  .option("--json", "Output JSON")
  .action(async (options: { json?: boolean }) => {
    const config = await requireConfig();
    const result = await readDataWarehouseSchema({
      host: config.posthog.host,
      apiKey: config.posthog.apiKey,
      projectId: config.posthog.projectId,
    });

    printResult(result, options.json);
  });

const insights = program
  .command("insights")
  .description("Run PostHog insight/HogQL analytics commands");

insights
  .command("run")
  .description("Run a PostHog insight query object")
  .option("--query-json <json>", "Insight query JSON object")
  .option("--query-file <path>", "Path to insight query JSON file")
  .option("--hogql <sql>", "Shortcut: run HogQL as a DataVisualizationNode")
  .option("--json", "Output JSON")
  .addHelpText(
    "after",
    `
Examples:
  $ vesai insights run --hogql "SELECT event, count() FROM events GROUP BY event LIMIT 20"
  $ vesai insights run --query-file ./query.json
`
  )
  .action(async (options: InsightRunOptions) => {
    const config = await requireConfig();
    const query = await parseInsightQueryInput(options);
    const result = await runInsightQuery({
      host: config.posthog.host,
      apiKey: config.posthog.apiKey,
      projectId: config.posthog.projectId,
      query,
    });

    printResult(result, options.json);
  });

insights
  .command("hogql <question>")
  .description("Generate HogQL insight from a natural-language question")
  .option("--json", "Output JSON")
  .action(async (question: string, options: { json?: boolean }) => {
    const config = await requireConfig();
    const result = await generateHogQLFromQuestion({
      host: config.posthog.host,
      apiKey: config.posthog.apiKey,
      projectId: config.posthog.projectId,
      question,
    });

    printResult(result, options.json);
  });

insights
  .command("sql <query>")
  .description("Execute SQL/HogQL through PostHog MCP execute_sql")
  .option("--json", "Output JSON")
  .action(async (query: string, options: { json?: boolean }) => {
    const config = await requireConfig();
    const result = await executeSqlQuery({
      host: config.posthog.host,
      apiKey: config.posthog.apiKey,
      projectId: config.posthog.projectId,
      query,
    });

    printResult(result, options.json);
  });

const errors = program
  .command("errors")
  .description("Query PostHog error-tracking data");

errors
  .command("list")
  .description("List top errors")
  .option(
    "--order-by <field>",
    "occurrences|first_seen|last_seen|users|sessions"
  )
  .option("--order-direction <dir>", "ASC|DESC")
  .option("--status <status>", "active|resolved|all|suppressed")
  .option("--from <isoDate>", "Start date (ISO timestamp)")
  .option("--to <isoDate>", "End date (ISO timestamp)")
  .option("--include-test-accounts", "Include test-account traffic")
  .option("--json", "Output JSON")
  .action(
    async (options: {
      orderBy?:
        | "occurrences"
        | "first_seen"
        | "last_seen"
        | "users"
        | "sessions";
      orderDirection?: "ASC" | "DESC";
      status?: "active" | "resolved" | "all" | "suppressed";
      from?: string;
      to?: string;
      includeTestAccounts?: boolean;
      json?: boolean;
    }) => {
      const config = await requireConfig();
      const result = await listErrors({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        input: {
          orderBy: options.orderBy,
          orderDirection: options.orderDirection,
          status: options.status,
          dateFrom: options.from,
          dateTo: options.to,
          filterTestAccounts: options.includeTestAccounts,
        },
      });

      printResult(result, options.json);
    }
  );

errors
  .command("details <issueId>")
  .description("Get detailed data for one error issue UUID")
  .option("--from <isoDate>", "Start date (ISO timestamp)")
  .option("--to <isoDate>", "End date (ISO timestamp)")
  .option("--json", "Output JSON")
  .action(
    async (
      issueId: string,
      options: {
        from?: string;
        to?: string;
        json?: boolean;
      }
    ) => {
      const config = await requireConfig();
      const result = await getErrorDetails({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        issueId,
        dateFrom: options.from,
        dateTo: options.to,
      });

      printResult(result, options.json);
    }
  );

const logs = program
  .command("logs")
  .description("Query PostHog logs and log metadata");

logs
  .command("query")
  .description("Run a logs query")
  .requiredOption("--from <isoDate>", "Start date (ISO timestamp)")
  .requiredOption("--to <isoDate>", "End date (ISO timestamp)")
  .option(
    "--severity <level>",
    "Repeatable: trace|debug|info|warn|error|fatal",
    collectOption,
    []
  )
  .option(
    "--service <name>",
    "Repeatable service-name filter",
    collectOption,
    []
  )
  .option("--search <term>", "Free-text search")
  .option("--order <order>", "latest|earliest")
  .option("--limit <n>", "Max rows", Number)
  .option("--after <cursor>", "Pagination cursor")
  .option("--json", "Output JSON")
  .action(
    async (options: {
      from: string;
      to: string;
      severity: string[];
      service: string[];
      search?: string;
      order?: "latest" | "earliest";
      limit?: number;
      after?: string;
      json?: boolean;
    }) => {
      const config = await requireConfig();
      const result = await queryLogs({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        input: {
          dateFrom: options.from,
          dateTo: options.to,
          severityLevels: options.severity as Array<
            "trace" | "debug" | "info" | "warn" | "error" | "fatal"
          >,
          serviceNames: options.service,
          searchTerm: options.search,
          orderBy: options.order,
          limit: options.limit,
          after: options.after,
        },
      });

      printResult(result, options.json);
    }
  );

logs
  .command("attributes")
  .description("List available log/resource attributes")
  .option("--type <type>", "log|resource")
  .option("--search <text>", "Filter by name")
  .option("--limit <n>", "Max rows", Number)
  .option("--offset <n>", "Pagination offset", Number)
  .option("--json", "Output JSON")
  .action(
    async (options: {
      type?: "log" | "resource";
      search?: string;
      limit?: number;
      offset?: number;
      json?: boolean;
    }) => {
      const config = await requireConfig();
      const result = await listLogAttributes({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        attributeType: options.type,
        search: options.search,
        limit: options.limit,
        offset: options.offset,
      });

      printResult(result, options.json);
    }
  );

logs
  .command("values <key>")
  .description("List values for a log/resource attribute key")
  .option("--type <type>", "log|resource")
  .option("--search <text>", "Filter values")
  .option("--json", "Output JSON")
  .action(
    async (
      key: string,
      options: { type?: "log" | "resource"; search?: string; json?: boolean }
    ) => {
      const config = await requireConfig();
      const result = await listLogAttributeValues({
        host: config.posthog.host,
        apiKey: config.posthog.apiKey,
        projectId: config.posthog.projectId,
        key,
        attributeType: options.type,
        search: options.search,
      });

      printResult(result, options.json);
    }
  );

const daemon = program.command("daemon").description("Daemon lifecycle");

daemon
  .command("start")
  .description("Start the local daemon in the background")
  .action(async () => {
    await ensureVesaiDirectories();
    await requireConfig();
    await ensurePlaywrightChromiumInstalled();

    const status = await getDaemonStatus();
    if (status.running && status.pid) {
      console.log(`Daemon is already running (pid ${status.pid}).`);
      return;
    }

    const started = await startDaemonInBackground();
    console.log(`Daemon started in background (pid ${started.pid}).`);
    console.log(`Logs: ${started.logFile}`);
    console.log("Use `vesai daemon watch` for foreground mode.");
  });

daemon
  .command("watch")
  .description("Run the daemon in foreground (Ctrl+C to stop)")
  .action(async () => {
    await ensureVesaiDirectories();
    await requireConfig();
    await ensurePlaywrightChromiumInstalled();

    console.log("Starting daemon in foreground. Press Ctrl+C to stop.");
    await startDaemon();
  });

daemon
  .command("status")
  .description("Show daemon status")
  .action(async () => {
    const status = await getDaemonStatus();
    printJson(status);
  });

daemon
  .command("stop")
  .description("Stop daemon")
  .action(async () => {
    const paths = getVesaiPaths();
    const status = await getDaemonStatus();

    if (!(status.running && status.pid)) {
      console.log("Daemon is not running.");
      return;
    }

    kill(status.pid, "SIGTERM");
    console.log(`Stopped daemon pid ${status.pid}`);
    console.log(`PID file: ${paths.daemonPidFile}`);
  });

const configCmd = program.command("config").description("Config commands");

configCmd
  .command("show")
  .description("Show current config")
  .action(async () => {
    const config = await loadConfig();
    printJson(config);
  });

configCmd
  .command("validate")
  .description("Validate current config")
  .action(async () => {
    const config = await requireConfig();
    printJson({ valid: true, project: config.gcloud.projectId });
  });

configCmd
  .command("set <path> <value>")
  .description("Set a config value using dot path")
  .action(async (path: string, value: string) => {
    const next = await updateConfig({
      updater: (config) => {
        const clone = structuredClone(config);
        const keys = path.split(".").filter(Boolean);
        if (!keys.length) {
          throw new Error("Invalid config path");
        }

        let current: Record<string, unknown> = clone as unknown as Record<
          string,
          unknown
        >;

        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i]!;
          const existing = current[key];
          if (!existing || typeof existing !== "object") {
            current[key] = {};
          }
          current = current[key] as Record<string, unknown>;
        }

        const finalKey = keys[keys.length - 1]!;
        let parsed: unknown = value;
        if (value === "true") {
          parsed = true;
        } else if (value === "false") {
          parsed = false;
        } else if (!Number.isNaN(Number(value))) {
          parsed = Number(value);
        }

        current[finalKey] = parsed;
        return clone;
      },
    });

    printJson({ updated: true, updatedAt: next.updatedAt });
  });

program
  .command("doctor")
  .description("Check local setup")
  .action(async () => {
    const home = resolveVesaiHome();
    const status = await getDaemonStatus();
    const config = await requireConfig();
    const playwrightExecutable = getPlaywrightChromiumExecutablePath();
    const playwrightInstalled =
      isPlaywrightChromiumInstalled(playwrightExecutable);

    printJson({
      home,
      daemon: status,
      posthogProject: config.posthog.projectId,
      gcloudProject: config.gcloud.projectId,
      bucket: config.gcloud.bucket,
      playwright: {
        installed: playwrightInstalled,
        executable: playwrightExecutable,
      },
    });
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
