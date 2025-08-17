import "server-only";
import posthog from "./posthog/server";

/**
 * Logs important events to Slack for monitoring key conversions and system events.
 *
 * @param {Object} params - The log parameters
 * @param {string} params.text - The message to log (use emojis to make it delightful!)
 * @param {string} [params.url] - Optional URL for easy navigation to the relevant resource
 *
 * @example
 * ```typescript
 * // Log a new user registration
 * await log({
 *   text: "👤 New user created: user@example.com"
 * });
 *
 * // Log a new order with link
 * await log({
 *   text: "💳 New order #12345 by user@example.com",
 *   url: "https://steppable.com/collection/product"
 * });
 * ```
 */
export default async function log({
  text,
  url,
}: {
  text: string;
  url?: string;
}) {
  try {
    // console.log test logs
    if (
      text.includes("mailslurp") ||
      process.env.NEXT_PUBLIC_URL !== "https://ves.ai"
    ) {
      console.log("🔍 Test log:", url ? `${text} | ${url}` : text);
      return;
    }

    await fetch(process.env.SLACK_WEBHOOK!, {
      method: "POST",
      body: JSON.stringify({
        text,
        attachments: url
          ? [
              {
                color: "#072132",
                fields: [
                  {
                    value: url,
                  },
                ],
              },
            ]
          : undefined,
      }),
    });
  } catch (error) {
    console.error("Failed to send log to Slack:", error);
    posthog.captureException(error);
  }
}
