import type { ErrorPayload, SuccessPayload } from "./types";

export async function postCallback(
  url: string,
  payload: SuccessPayload | ErrorPayload,
): Promise<void> {
  console.log("📨 [CALLBACK] Sending result to callback URL...");
  console.log(`  🔗 URL: ${url}`);
  console.log(`  📊 Status: ${payload.success ? "✅ Success" : "❌ Error"}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      // Swallow but log – we don't rethrow to avoid masking the primary result
      console.error(`  ⚠️ [WARNING] Callback POST failed: ${res.status}`);
      console.error(`  📝 Response: ${text}`);
    } else {
      console.log(`  ✅ Callback sent successfully (${res.status})`);
    }
  } catch (e: any) {
    console.error(`  ❌ [ERROR] Callback POST exception:`, e?.message || e);
  }
}
