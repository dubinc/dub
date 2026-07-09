import { getPlanSummaries } from "@/lib/ai/plan-context";
import { tool } from "ai";
import { z } from "zod";

const planSummarySchema = z.object({
  name: z.string(),
  order: z.number(),
  featureTitle: z.string().optional(),
  features: z.array(z.string()),
  capabilities: z.record(z.string(), z.boolean()),
});

export const getPlanComparisonTool = tool({
  description:
    "Returns the canonical Dub plan hierarchy and features. Use when users ask about plan differences, upgrades, or which plan includes a feature.",
  inputSchema: z.object({}),
  outputSchema: z.array(planSummarySchema),
  execute: async () => getPlanSummaries(),
});
