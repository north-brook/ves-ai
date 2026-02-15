const DEFAULT_HOST = "https://us.posthog.com";
const DEFAULT_LIMIT = 100;

export type PostHogProject = {
  id: string | number;
  name: string;
};

export type PostHogPerson = {
  uuid?: string;
  id?: string;
  name?: string;
  properties?: Record<string, unknown>;
};

export type PostHogRecording = {
  id: string;
  start_time?: string;
  end_time?: string;
  active_seconds?: number;
  inactive_seconds?: number;
  start_url?: string;
  distinct_id?: string;
  person?: PostHogPerson | null;
  ongoing?: boolean;
  [key: string]: unknown;
};

export type PostHogQueryFilters = {
  text?: string;
  email?: string;
  groupId?: string;
  groupKey?: string;
  domain?: string;
  urlContains?: string;
  sessionId?: string;
  sessionContains?: string;
  distinctId?: string;
  startsAfter?: string;
  startsBefore?: string;
  minActiveSeconds?: number;
  maxActiveSeconds?: number;
  includeOngoing?: boolean;
  requirePerson?: boolean;
  properties?: Record<string, string>;
  limit?: number;
};

type PostHogRecordingsResponse = {
  results: PostHogRecording[];
  has_next: boolean;
};

export type PostHogEventDefinition = {
  id?: number;
  name?: string;
  description?: string | null;
  verified?: boolean;
  hidden?: boolean;
  tags?: string[];
  [key: string]: unknown;
};

export type PostHogPropertyDefinition = {
  id?: number;
  name?: string;
  property_type?: string;
  type?: string;
  is_numerical?: boolean;
  hidden?: boolean;
  [key: string]: unknown;
};

export type PostHogLogsQueryParams = {
  dateFrom: string;
  dateTo: string;
  severityLevels?: Array<
    "trace" | "debug" | "info" | "warn" | "error" | "fatal"
  >;
  serviceNames?: string[];
  searchTerm?: string;
  orderBy?: "latest" | "earliest";
  limit?: number;
  after?: string;
};

export type PostHogErrorListParams = {
  orderBy?: "occurrences" | "first_seen" | "last_seen" | "users" | "sessions";
  dateFrom?: string;
  dateTo?: string;
  orderDirection?: "ASC" | "DESC";
  filterTestAccounts?: boolean;
  status?: "active" | "resolved" | "all" | "suppressed";
};

async function posthogRequest<T>(params: {
  host?: string;
  apiKey: string;
  path: string;
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}): Promise<T> {
  const host = (params.host || DEFAULT_HOST).replace(/\/+$/, "");
  const url = new URL(`${host}${params.path}`);

  for (const [key, value] of Object.entries(params.query || {})) {
    if (value === undefined) {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    method: params.method || "GET",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: params.body === undefined ? undefined : JSON.stringify(params.body),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `PostHog API error (${response.status}): ${body.slice(0, 240)}`
    );
  }

  return (await response.json()) as T;
}

export async function listProjects(params: {
  host?: string;
  apiKey: string;
}): Promise<PostHogProject[]> {
  const response = await posthogRequest<{ results: PostHogProject[] }>({
    host: params.host,
    apiKey: params.apiKey,
    path: "/api/projects",
  });

  return response.results || [];
}

export async function listRecordingsPage(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  offset?: number;
  limit?: number;
  dateFrom?: string;
}): Promise<PostHogRecordingsResponse> {
  return posthogRequest<PostHogRecordingsResponse>({
    host: params.host,
    apiKey: params.apiKey,
    path: `/api/projects/${encodeURIComponent(params.projectId)}/session_recordings`,
    query: {
      offset: params.offset ?? 0,
      limit: params.limit ?? DEFAULT_LIMIT,
      date_from: params.dateFrom,
    },
  });
}

export async function listAllRecordings(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  dateFrom?: string;
  maxPages?: number;
}): Promise<PostHogRecording[]> {
  const maxPages = params.maxPages ?? 50;
  const results: PostHogRecording[] = [];

  let offset = 0;
  for (let page = 0; page < maxPages; page++) {
    const data = await listRecordingsPage({
      ...params,
      offset,
      limit: DEFAULT_LIMIT,
    });

    results.push(...(data.results || []));

    if (!(data.has_next && data.results?.length)) {
      break;
    }
    offset += DEFAULT_LIMIT;
  }

  return results;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const email = value.trim().toLowerCase();
  if (!email.includes("@")) {
    return null;
  }
  return email;
}

export function getRecordingUserEmail(
  recording: PostHogRecording
): string | null {
  const props = recording.person?.properties || {};
  const candidates = [
    props.email,
    props.$email,
    props.user_email,
    props.contact_email,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeEmail(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export async function findRecordingsByUserEmail(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  email: string;
  domainFilter: string;
}): Promise<PostHogRecording[]> {
  const email = params.email.trim().toLowerCase();
  const all = await listAllRecordings(params);

  return all.filter((recording) => {
    if (recording.ongoing) {
      return false;
    }
    if (
      params.domainFilter &&
      typeof recording.start_url === "string" &&
      !recording.start_url.includes(params.domainFilter)
    ) {
      return false;
    }

    return getRecordingUserEmail(recording) === email;
  });
}

export async function findRecordingsByGroupId(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  groupKey: string;
  groupId: string;
  domainFilter: string;
}): Promise<PostHogRecording[]> {
  const groupId = params.groupId.trim();
  const all = await listAllRecordings(params);

  return all.filter((recording) => {
    if (recording.ongoing) {
      return false;
    }
    if (
      params.domainFilter &&
      typeof recording.start_url === "string" &&
      !recording.start_url.includes(params.domainFilter)
    ) {
      return false;
    }

    const props = recording.person?.properties || {};
    const candidate = props[params.groupKey] ?? props[`$${params.groupKey}`];
    return String(candidate ?? "") === groupId;
  });
}

export async function findRecordingsByQuery(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  query?: string;
  domainFilter?: string;
  filters?: PostHogQueryFilters;
}): Promise<PostHogRecording[]> {
  const filter: PostHogQueryFilters = {
    ...(params.filters || {}),
    text: params.filters?.text || params.query,
    domain: params.filters?.domain || params.domainFilter,
  };
  const textNeedle = filter.text?.trim().toLowerCase();
  const all = await listAllRecordings(params);

  const filtered = all.filter((recording) => {
    if (!filter.includeOngoing && recording.ongoing) {
      return false;
    }

    if (filter.requirePerson && !recording.person) {
      return false;
    }

    if (filter.email) {
      const email = getRecordingUserEmail(recording);
      if (email !== filter.email.trim().toLowerCase()) {
        return false;
      }
    }

    if (filter.groupId) {
      const groupKey = filter.groupKey || "group_id";
      const props = recording.person?.properties || {};
      const value = props[groupKey] ?? props[`$${groupKey}`];
      if (String(value ?? "") !== filter.groupId) {
        return false;
      }
    }

    const url = String(recording.start_url ?? "").toLowerCase();
    if (filter.domain && url && !url.includes(filter.domain.toLowerCase())) {
      return false;
    }

    if (filter.urlContains && !url.includes(filter.urlContains.toLowerCase())) {
      return false;
    }

    if (filter.sessionId && recording.id !== filter.sessionId) {
      return false;
    }

    const id = String(recording.id).toLowerCase();
    if (
      filter.sessionContains &&
      !id.includes(filter.sessionContains.toLowerCase())
    ) {
      return false;
    }

    if (filter.distinctId) {
      const distinctId = String(recording.distinct_id ?? "").toLowerCase();
      if (distinctId !== filter.distinctId.toLowerCase()) {
        return false;
      }
    }

    const activeSeconds = Number(recording.active_seconds ?? 0);
    if (
      filter.minActiveSeconds !== undefined &&
      activeSeconds < filter.minActiveSeconds
    ) {
      return false;
    }

    if (
      filter.maxActiveSeconds !== undefined &&
      activeSeconds > filter.maxActiveSeconds
    ) {
      return false;
    }

    const startTime = recording.start_time
      ? Date.parse(recording.start_time)
      : Number.NaN;
    if (
      filter.startsAfter &&
      Number.isFinite(startTime) &&
      startTime < Date.parse(filter.startsAfter)
    ) {
      return false;
    }

    if (
      filter.startsBefore &&
      Number.isFinite(startTime) &&
      startTime > Date.parse(filter.startsBefore)
    ) {
      return false;
    }

    if (filter.properties) {
      const props = recording.person?.properties || {};
      for (const [key, expected] of Object.entries(filter.properties)) {
        const raw = props[key] ?? props[`$${key}`];
        if (String(raw ?? "").toLowerCase() !== expected.toLowerCase()) {
          return false;
        }
      }
    }

    const person = JSON.stringify(
      recording.person?.properties ?? {}
    ).toLowerCase();
    if (!textNeedle) {
      return true;
    }
    const distinctId = String(recording.distinct_id ?? "").toLowerCase();
    const email = getRecordingUserEmail(recording) ?? "";
    return (
      url.includes(textNeedle) ||
      person.includes(textNeedle) ||
      id.includes(textNeedle) ||
      distinctId.includes(textNeedle) ||
      email.includes(textNeedle)
    );
  });

  const sorted = filtered.sort((a, b) =>
    String(b.start_time || "").localeCompare(String(a.start_time || ""))
  );

  if (!filter.limit) {
    return sorted;
  }
  return sorted.slice(0, filter.limit);
}

export async function findRecordingById(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  sessionId: string;
}): Promise<PostHogRecording | null> {
  const all = await listAllRecordings(params);
  return all.find((recording) => recording.id === params.sessionId) ?? null;
}

function normalizeDateToIso(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return new Date(parsed).toISOString();
}

function parseStringContentMaybeJson(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return content;
  }
}

type PostHogMcpToolResult = {
  success: boolean;
  content: string;
};

export async function invokePostHogMcpTool(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  toolName: string;
  args: Record<string, unknown>;
}): Promise<unknown> {
  const result = await posthogRequest<PostHogMcpToolResult>({
    host: params.host,
    apiKey: params.apiKey,
    method: "POST",
    path: `/api/environments/${encodeURIComponent(params.projectId)}/mcp_tools/${encodeURIComponent(params.toolName)}/`,
    body: {
      args: params.args,
    },
  });

  if (!result.success) {
    throw new Error(
      `PostHog MCP tool '${params.toolName}' failed: ${result.content}`
    );
  }

  return parseStringContentMaybeJson(result.content);
}

export async function readDataSchema(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  query?: string;
}): Promise<unknown> {
  return invokePostHogMcpTool({
    host: params.host,
    apiKey: params.apiKey,
    projectId: params.projectId,
    toolName: "read_taxonomy",
    args: {
      query: params.query,
    },
  });
}

export async function readDataWarehouseSchema(params: {
  host?: string;
  apiKey: string;
  projectId: string;
}): Promise<unknown> {
  return invokePostHogMcpTool({
    host: params.host,
    apiKey: params.apiKey,
    projectId: params.projectId,
    toolName: "read_data_warehouse_schema",
    args: {
      query: {
        kind: "data_warehouse_schema",
      },
    },
  });
}

export async function executeSqlQuery(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  query: string;
}): Promise<unknown> {
  return invokePostHogMcpTool({
    host: params.host,
    apiKey: params.apiKey,
    projectId: params.projectId,
    toolName: "execute_sql",
    args: {
      query: params.query,
    },
  });
}

export async function listEventDefinitions(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PostHogEventDefinition[]> {
  const response = await posthogRequest<{ results: PostHogEventDefinition[] }>({
    host: params.host,
    apiKey: params.apiKey,
    path: `/api/projects/${encodeURIComponent(params.projectId)}/event_definitions/`,
    query: {
      search: params.search,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    },
  });
  return response.results || [];
}

export async function listPropertyDefinitions(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  type: "event" | "person";
  eventName?: string;
  includePredefinedProperties?: boolean;
  limit?: number;
  offset?: number;
}): Promise<PostHogPropertyDefinition[]> {
  const eventNames =
    params.type === "event" && params.eventName
      ? JSON.stringify([params.eventName])
      : undefined;
  const response = await posthogRequest<{
    results: PostHogPropertyDefinition[];
  }>({
    host: params.host,
    apiKey: params.apiKey,
    path: `/api/projects/${encodeURIComponent(params.projectId)}/property_definitions/`,
    query: {
      type: params.type,
      event_names: eventNames,
      filter_by_event_names: params.type === "event",
      exclude_core_properties: !(params.includePredefinedProperties ?? false),
      exclude_hidden: true,
      is_feature_flag: false,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    },
  });
  return response.results || [];
}

export async function runInsightQuery(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  query: Record<string, unknown>;
}): Promise<{
  results?: unknown;
  columns?: unknown;
  [key: string]: unknown;
}> {
  return posthogRequest({
    host: params.host,
    apiKey: params.apiKey,
    method: "POST",
    path: `/api/environments/${encodeURIComponent(params.projectId)}/query/`,
    body: {
      query: params.query,
    },
  });
}

export async function generateHogQLFromQuestion(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  question: string;
}): Promise<unknown[]> {
  const response = await posthogRequest<unknown[]>({
    host: params.host,
    apiKey: params.apiKey,
    method: "POST",
    path: `/api/environments/${encodeURIComponent(params.projectId)}/max_tools/create_and_query_insight/`,
    body: {
      query: params.question,
      insight_type: "sql",
    },
  });

  return response.filter((item) => {
    if (!(item && typeof item === "object")) {
      return true;
    }
    const candidate = item as Record<string, unknown>;
    if (candidate.type !== "message") {
      return true;
    }
    const data = candidate.data as Record<string, unknown> | undefined;
    return data?.type !== "ack";
  });
}

export async function listErrors(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  input?: PostHogErrorListParams;
}): Promise<unknown[]> {
  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const input = params.input || {};

  const response = await runInsightQuery({
    host: params.host,
    apiKey: params.apiKey,
    projectId: params.projectId,
    query: {
      kind: "ErrorTrackingQuery",
      orderBy: input.orderBy || "occurrences",
      dateRange: {
        date_from:
          normalizeDateToIso(input.dateFrom) || sevenDaysAgo.toISOString(),
        date_to: normalizeDateToIso(input.dateTo) || now.toISOString(),
      },
      volumeResolution: 1,
      orderDirection: input.orderDirection || "DESC",
      filterTestAccounts: input.filterTestAccounts ?? true,
      status: input.status || "active",
    },
  });

  const results = response.results;
  return Array.isArray(results) ? results : [];
}

export async function getErrorDetails(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  issueId: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<unknown[]> {
  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const response = await runInsightQuery({
    host: params.host,
    apiKey: params.apiKey,
    projectId: params.projectId,
    query: {
      kind: "ErrorTrackingQuery",
      orderBy: "occurrences",
      dateRange: {
        date_from:
          normalizeDateToIso(params.dateFrom) || sevenDaysAgo.toISOString(),
        date_to: normalizeDateToIso(params.dateTo) || now.toISOString(),
      },
      volumeResolution: 0,
      issueId: params.issueId,
    },
  });

  const results = response.results;
  return Array.isArray(results) ? results : [];
}

export async function queryLogs(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  input: PostHogLogsQueryParams;
}): Promise<{
  results: unknown[];
  hasMore: boolean;
  nextCursor: string | null;
}> {
  return posthogRequest({
    host: params.host,
    apiKey: params.apiKey,
    method: "POST",
    path: `/api/projects/${encodeURIComponent(params.projectId)}/logs/query/`,
    body: {
      query: {
        dateRange: {
          date_from: params.input.dateFrom,
          date_to: params.input.dateTo,
        },
        severityLevels: params.input.severityLevels ?? [],
        serviceNames: params.input.serviceNames ?? [],
        searchTerm: params.input.searchTerm ?? null,
        orderBy: params.input.orderBy ?? "latest",
        limit: params.input.limit ?? 100,
        after: params.input.after ?? null,
        filterGroup: { type: "AND", values: [] },
      },
    },
  });
}

export async function listLogAttributes(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  search?: string;
  attributeType?: "log" | "resource";
  limit?: number;
  offset?: number;
}): Promise<{
  results: Array<{ name: string; propertyFilterType: string }>;
  count: number;
}> {
  return posthogRequest({
    host: params.host,
    apiKey: params.apiKey,
    path: `/api/projects/${encodeURIComponent(params.projectId)}/logs/attributes/`,
    query: {
      search: params.search,
      attribute_type: params.attributeType ?? "log",
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
    },
  });
}

export async function listLogAttributeValues(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  key: string;
  attributeType?: "log" | "resource";
  search?: string;
}): Promise<Array<{ id: string; name: string }>> {
  return posthogRequest({
    host: params.host,
    apiKey: params.apiKey,
    path: `/api/projects/${encodeURIComponent(params.projectId)}/logs/values/`,
    query: {
      key: params.key,
      attribute_type: params.attributeType ?? "log",
      value: params.search,
    },
  });
}
