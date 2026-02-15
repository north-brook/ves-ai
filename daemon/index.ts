import { ensureVesaiDirectories } from "../config";
import { startDaemon } from "./runner";

async function main() {
  await ensureVesaiDirectories();
  console.log("Starting VES AI daemon...");
  await startDaemon();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
