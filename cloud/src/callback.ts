import type { ErrorPayload, SuccessPayload } from "./types";

export async function postCallback(
  url: string,
  payload: SuccessPayload | ErrorPayload,
): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      // Swallow but log – we don't rethrow to avoid masking the primary result
      console.error(`Callback POST failed: ${res.status} ${text}`);
    }
  } catch (e: any) {
    console.error(`Callback POST error:`, e?.message || e);
  }
}
