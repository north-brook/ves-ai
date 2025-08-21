type RecordingMeta = {
  recording_duration?: number;
  active_seconds?: number;
};

export default async function enableSharingAndGetEmbedUrl(
  sourceHost: string,
  sourceKey: string,
  sourceProject: string,
  externalId: string,
): Promise<string> {
  const host = sourceHost.replace(/\/+$/, "");
  const base = `${host}/api/projects/${sourceProject}/session_recordings/${externalId}`;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sourceKey}`,
  };

  // 1) Enable sharing (idempotent)
  {
    const res = await fetch(`${base}/sharing/`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ enabled: true }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PostHog sharing PATCH failed: ${res.status} ${text}`);
    }
  }

  // 2) Retrieve access token
  const getRes = await fetch(`${base}/sharing/`, { headers });
  if (!getRes.ok) {
    const text = await getRes.text();
    throw new Error(`PostHog sharing GET failed: ${getRes.status} ${text}`);
  }
  const json = (await getRes.json()) as {
    accessToken?: string;
    access_token?: string;
  };
  const token = json.accessToken ?? json.access_token;
  if (!token)
    throw new Error("PostHog sharing: access token missing in response");
  return `${host}/embedded/${token}`;
}
