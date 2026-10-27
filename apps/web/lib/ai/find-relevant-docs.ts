import { tool } from "ai";
import { z } from "zod";
import { vectorIndex } from "../upstash/vector";

export const findRelevantDocsTool = tool({
  description: "Finds the most relevant docs / help article for a given query.",
  inputSchema: z.object({
    query: z.string().describe("The query to search for."),
    accountType: z
      .enum(["workspace", "partner"])
      .describe("The type of account the user is asking about."),
  }),
  execute: async ({ query }) => {
    const result = await vectorIndex.query({
      data: query,
      topK: 4,
      includeMetadata: true,
    });

    // Return array of metadata for each chunk
    // e.g. [{ id, score, metadata: { resourceId, content }}, ... ]
    return result.map(({ id, score, metadata }) => ({
      id,
      score,
      metadata,
    }));
  },
});
