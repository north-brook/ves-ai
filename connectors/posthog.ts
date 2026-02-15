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

type PostHogRecordingsResponse = {
  results: PostHogRecording[];
  has_next: boolean;
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
  const allRecordings: PostHogRecording[] = [];

  let offset = 0;
  for (let page = 0; page < maxPages; page++) {
    const pageData = await listRecordingsPage({
      ...params,
      offset,
      limit: DEFAULT_LIMIT,
    });

    allRecordings.push(...(pageData.results || []));

    if (!(pageData.has_next && pageData.results?.length)) {
      break;
    }
    offset += DEFAULT_LIMIT;
  }

  return allRecordings;
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

export async function findRecordingById(params: {
  host?: string;
  apiKey: string;
  projectId: string;
  sessionId: string;
}): Promise<PostHogRecording | null> {
  const all = await listAllRecordings(params);
  return all.find((recording) => recording.id === params.sessionId) ?? null;
}
