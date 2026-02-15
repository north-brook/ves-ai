import { ensureVesaiDirectories } from "../../packages/config/src";
import { startDaemon } from "../../packages/core/src";

async function main() {
  await ensureVesaiDirectories();
  console.log("Starting VESAI daemon...");
  await startDaemon();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
