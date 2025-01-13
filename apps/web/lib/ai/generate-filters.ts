"use server";

import { VALID_ANALYTICS_FILTERS } from "@/lib/analytics/constants";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { anthropic } from "@ai-sdk/anthropic";
import { parseDateTime } from "@dub/utils";
import { streamObject } from "ai";
import { createStreamableValue } from "ai/rsc";

export async function generateFilters(prompt: string) {
  const stream = createStreamableValue();

  (async () => {
    const { partialObjectStream } = await streamObject({
      model: anthropic("claude-3-5-sonnet-latest"),
      schema: analyticsQuerySchema.pick({
        ...(VALID_ANALYTICS_FILTERS.reduce((acc, filter) => {
          acc[filter] = true;
          return acc;
        }, {}) as any),
      }),
      prompt,
      temperature: 0.4,
    });

    for await (const partialObject of partialObjectStream) {
      stream.update(
        Object.fromEntries(
          Object.entries(partialObject).map(([key, value]) => {
            if (!["start", "end"].includes(key) || value === null)
              return [key, value];

            // Convert start and end dates to standard format
            return [
              key,
              value ? parseDateTime(value.toString())?.toISOString() : value,
            ];
          }),
        ),
      );
    }

    stream.done();
  })();

  return { object: stream.value };
}
