const INSTALL_SCRIPT = `#!/usr/bin/env bash
set -euo pipefail
curl -fsSL https://raw.githubusercontent.com/north-brook/vesai/main/scripts/install.sh | bash
`;

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return new Response(INSTALL_SCRIPT, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
