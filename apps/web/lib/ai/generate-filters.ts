"use server";

import { VALID_ANALYTICS_FILTERS } from "@/lib/analytics/constants";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { anthropic } from "@ai-sdk/anthropic";
import { createStreamableValue } from "@ai-sdk/rsc";
import { Output, streamText } from "ai";
import * as z from "zod/v4";

function getDescription(schema: z.ZodTypeAny): string {
  const s = schema as { description?: string; _def?: { description?: string } };
  return s.description ?? s._def?.description ?? "";
}

/** Schema for AI filter generation: same keys as analytics filters but all string (no parseFilterValue transform). */
function buildAIFilterSchema() {
  const shape = analyticsQuerySchema.shape as Record<string, z.ZodTypeAny>;
  const entries = VALID_ANALYTICS_FILTERS.filter(
    (key) => shape[key] != null,
  ).map((key) => {
    return [
      key,
      z.string().optional().describe(getDescription(shape[key])),
    ] as const;
  });
  return z.object(Object.fromEntries(entries));
}

const AI_FILTER_SCHEMA = buildAIFilterSchema();

const SYSTEM_PROMPT = `You are an analytics filter assistant. Extract or infer filter parameters from the user's request.

Output format: every filter value must use the advanced filtering syntax as a single string:
- Single value: \`dub.co\`
- Multiple values (comma-separated): \`dub.co,google.com\`
- Exclusion (prefix with -): \`-spam.com\`

Only include fields that are clearly requested or implied. Omit optional fields when not relevant. For dates use ISO 8601 (e.g. 2024-01-15).`;

export async function generateFilters(prompt: string) {
  const stream = createStreamableValue();

  (async () => {
    const { partialOutputStream } = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      output: Output.object({ schema: AI_FILTER_SCHEMA }),
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.4,
    });

    for await (const partialObject of partialOutputStream) {
      const parsed = AI_FILTER_SCHEMA.safeParse(partialObject);
      if (parsed.success) stream.update(parsed.data);
    }

    stream.done();
  })();

  return { object: stream.value };
}
