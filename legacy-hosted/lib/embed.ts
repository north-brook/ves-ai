import {
  google,
  GoogleGenerativeAIEmbeddingProviderOptions,
} from "@ai-sdk/google";
import { embed as aiEmbed } from "ai";

export default async function embed(
  value: string,
  task?: GoogleGenerativeAIEmbeddingProviderOptions["taskType"],
): Promise<number[]> {
  const { embedding } = await aiEmbed({
    model: google.textEmbeddingModel("gemini-embedding-001"),
    value,
    providerOptions: {
      google: {
        outputDimensionality: 512,
        taskType: task || "CLUSTERING",
      } satisfies GoogleGenerativeAIEmbeddingProviderOptions,
    },
  });

  return normalize(embedding);
}

function normalize(embedding: number[]): number[] {
  const n = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  if (n === 0) return embedding.slice(); // avoid division by zero
  return embedding.map((v) => v / n);
}
