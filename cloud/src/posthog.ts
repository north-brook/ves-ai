
export type RecordingMeta = {
  recording_duration?: number; // total seconds (active + inactive)
  active_seconds?: number; // seconds with activity
};

export async function enableSharingAndGetEmbedToken(
  sourceHost: string,
  sourceKey: string,
  sourceProject: string,
  recordingId: string,
): Promise<string> {
  const host = sourceHost.replace(/\/+$/, '');
  const base = `${host}/api/projects/${sourceProject}/session_recordings/${recordingId}`;

  const headers = {
    "Content-Type": "application/json",
    // Personal API key
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
  const json = (await getRes.json()) as any;
  const token = json.accessToken ?? json.access_token;
  if (!token)
    throw new Error("PostHog sharing: access token missing in response");
  return `${host}/embedded/${token}`;
}

export async function getRecordingMeta(
  sourceHost: string,
  sourceKey: string,
  sourceProject: string,
  recordingId: string,
): Promise<RecordingMeta> {
  console.log("📊 [POSTHOG] Fetching recording metadata...");
  const host = sourceHost.replace(/\/+$/, '');
  const url = `${host}/api/projects/${sourceProject}/session_recordings/${recordingId}/`;
  console.log(`  🔗 API URL: ${url}`);
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${sourceKey}` },
  });
  
  if (!res.ok) {
    const text = await res.text();
    console.error(`  ❌ [ERROR] PostHog API failed: ${res.status}`);
    console.error(`  📝 Response: ${text}`);
    throw new Error(`PostHog meta GET failed: ${res.status} ${text}`);
  }
  
  const json = await res.json();
  const meta = {
    recording_duration: json.recording_duration ?? undefined,
    active_seconds: json.active_seconds ?? undefined,
  };
  
  console.log(`  ✅ Metadata retrieved:`);
  console.log(`    🎦 Total duration: ${meta.recording_duration ?? 'unknown'}s`);
  console.log(`    ⏱️ Active duration: ${meta.active_seconds ?? 'unknown'}s`);
  
  return meta;
}
