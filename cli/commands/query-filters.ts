import type { VesaiConfig } from "../../config";
import type { PostHogQueryFilters } from "../../connectors/posthog";

export type QueryCommandOptions = {
  email?: string;
  group?: string;
  groupKey?: string;
  domain?: string;
  allDomains?: boolean;
  url?: string;
  sessionId?: string;
  sessionContains?: string;
  distinctId?: string;
  from?: string;
  to?: string;
  minActive?: number;
  maxActive?: number;
  includeOngoing?: boolean;
  requirePerson?: boolean;
  where?: string[];
  limit?: number;
};

export function collectOption(
  value: string,
  previous: string[] = []
): string[] {
  return [...previous, value];
}

export function parseWhereAssignments(
  values: string[] = []
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of values) {
    const idx = entry.indexOf("=");
    if (idx <= 0 || idx === entry.length - 1) {
      throw new Error(
        `Invalid --where value "${entry}". Expected format: key=value`
      );
    }

    const key = entry.slice(0, idx).trim();
    const value = entry.slice(idx + 1).trim();
    if (!(key && value)) {
      throw new Error(
        `Invalid --where value "${entry}". Expected format: key=value`
      );
    }

    out[key] = value;
  }
  return out;
}

function parseDateOrThrow(
  value: string | undefined,
  flag: string
): string | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${flag} date "${value}". Use ISO format.`);
  }
  return new Date(parsed).toISOString();
}

function hasMeaningfulFilter(filters: PostHogQueryFilters): boolean {
  return Boolean(
    filters.text ||
      filters.email ||
      filters.groupId ||
      filters.domain ||
      filters.urlContains ||
      filters.sessionId ||
      filters.sessionContains ||
      filters.distinctId ||
      filters.startsAfter ||
      filters.startsBefore ||
      filters.minActiveSeconds !== undefined ||
      filters.maxActiveSeconds !== undefined ||
      filters.includeOngoing ||
      filters.requirePerson ||
      (filters.properties && Object.keys(filters.properties).length > 0)
  );
}

export function buildQueryFilters(params: {
  text?: string;
  options: QueryCommandOptions;
  config: VesaiConfig;
}): PostHogQueryFilters {
  const hasExplicitInput = Boolean(
    params.text?.trim() ||
      params.options.email ||
      params.options.group ||
      params.options.groupKey ||
      params.options.domain ||
      params.options.allDomains ||
      params.options.url ||
      params.options.sessionId ||
      params.options.sessionContains ||
      params.options.distinctId ||
      params.options.from ||
      params.options.to ||
      params.options.minActive !== undefined ||
      params.options.maxActive !== undefined ||
      params.options.includeOngoing ||
      params.options.requirePerson ||
      (params.options.where && params.options.where.length > 0) ||
      params.options.limit !== undefined
  );
  if (!hasExplicitInput) {
    throw new Error(
      "No query filters provided. Pass text and/or filters (run `vesai replays query --help`)."
    );
  }

  const properties = parseWhereAssignments(params.options.where || []);
  const startsAfter = parseDateOrThrow(params.options.from, "--from");
  const startsBefore = parseDateOrThrow(params.options.to, "--to");

  if (
    params.options.minActive !== undefined &&
    !Number.isFinite(params.options.minActive)
  ) {
    throw new Error("--min-active must be a valid number.");
  }

  if (
    params.options.maxActive !== undefined &&
    !Number.isFinite(params.options.maxActive)
  ) {
    throw new Error("--max-active must be a valid number.");
  }

  if (
    params.options.limit !== undefined &&
    !Number.isFinite(params.options.limit)
  ) {
    throw new Error("--limit must be a valid number.");
  }

  if (
    startsAfter &&
    startsBefore &&
    new Date(startsAfter).getTime() > new Date(startsBefore).getTime()
  ) {
    throw new Error("--from must be earlier than or equal to --to.");
  }

  if (
    params.options.minActive !== undefined &&
    params.options.maxActive !== undefined &&
    params.options.minActive > params.options.maxActive
  ) {
    throw new Error("--min-active cannot be greater than --max-active.");
  }

  if (params.options.limit !== undefined && params.options.limit <= 0) {
    throw new Error("--limit must be a positive integer.");
  }

  const filters: PostHogQueryFilters = {
    text: params.text?.trim() || undefined,
    email: params.options.email?.trim() || undefined,
    groupId: params.options.group?.trim() || undefined,
    groupKey:
      params.options.groupKey?.trim() ||
      (params.options.group ? params.config.posthog.groupKey : undefined),
    domain: params.options.allDomains
      ? undefined
      : params.options.domain?.trim() || params.config.posthog.domainFilter,
    urlContains: params.options.url?.trim() || undefined,
    sessionId: params.options.sessionId?.trim() || undefined,
    sessionContains: params.options.sessionContains?.trim() || undefined,
    distinctId: params.options.distinctId?.trim() || undefined,
    startsAfter,
    startsBefore,
    minActiveSeconds:
      params.options.minActive === undefined
        ? undefined
        : params.options.minActive,
    maxActiveSeconds:
      params.options.maxActive === undefined
        ? undefined
        : params.options.maxActive,
    includeOngoing: params.options.includeOngoing,
    requirePerson: params.options.requirePerson,
    properties: Object.keys(properties).length ? properties : undefined,
    limit: params.options.limit,
  };

  if (!hasMeaningfulFilter(filters)) {
    throw new Error(
      "No query filters provided. Pass text and/or filters (run `vesai replays query --help`)."
    );
  }

  return filters;
}
