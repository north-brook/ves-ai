import fs from "fs/promises";
import path from "path";

export interface DebugEntry {
  timestamp: string;
  job: string;
  id: string;
  systemPrompt: string;
  userPrompt: string;
  modelResponse: string;
  runNumber?: number;
  itemName?: string;
}

export async function writeDebugFile(
  filename: string,
  entry: DebugEntry,
  append: boolean = false,
): Promise<void> {
  try {
    const debugDir = path.join(process.cwd(), "app", "jobs", "debug");
    
    // Ensure debug directory exists
    await fs.mkdir(debugDir, { recursive: true });
    
    const debugFile = path.join(debugDir, filename);
    
    let content = "";
    
    // Format content based on whether it's a reconciliation run or main analysis
    if (entry.runNumber !== undefined && entry.itemName) {
      // Reconciliation format
      content = `
========================================
RUN #${entry.runNumber} - ${entry.timestamp}
${entry.job.toUpperCase()}: ${entry.itemName}
ID: ${entry.id}
========================================

SYSTEM PROMPT:
${entry.systemPrompt}

USER PROMPT:
${entry.userPrompt}

MODEL RESPONSE:
${entry.modelResponse}

`;
    } else {
      // Main analysis format
      content = `
========================================
TIMESTAMP: ${entry.timestamp}
JOB: ${entry.job}
ID: ${entry.id}
========================================

SYSTEM PROMPT:
${entry.systemPrompt}

USER PROMPT:
${entry.userPrompt}

MODEL RESPONSE:
${entry.modelResponse}

========================================
`;
    }
    
    if (append) {
      await fs.appendFile(debugFile, content, "utf-8");
    } else {
      await fs.writeFile(debugFile, content, "utf-8");
    }
    
    console.log(`💾 Debug file ${append ? "appended" : "saved"} to: ${debugFile}`);
  } catch (error) {
    // Log but don't fail if debug file can't be written
    console.error("❌ Failed to write debug file:", error);
  }
}

export async function clearDebugFile(filename: string): Promise<void> {
  try {
    const debugDir = path.join(process.cwd(), "app", "jobs", "debug");
    const debugFile = path.join(debugDir, filename);
    
    // Create empty file to clear it
    await fs.mkdir(debugDir, { recursive: true });
    await fs.writeFile(debugFile, "", "utf-8");
    
    console.log(`🧹 Cleared debug file: ${debugFile}`);
  } catch (error) {
    console.error("❌ Failed to clear debug file:", error);
  }
}