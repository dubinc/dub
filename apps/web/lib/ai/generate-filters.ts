"use server";

import { VALID_ANALYTICS_FILTERS } from "@/lib/analytics/constants";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { createStreamableValue } from "ai/rsc";

export async function generateFilters(prompt: string) {
  const stream = createStreamableValue();

  const schema = analyticsQuerySchema.pick({
    ...(VALID_ANALYTICS_FILTERS.reduce((acc, filter) => {
      acc[filter] = true;
      return acc;
    }, {}) as any),
  });

  (async () => {
    const { partialObjectStream } = await streamObject({
      model: anthropic("claude-3-5-sonnet-latest"),
      schema,
      prompt,
      temperature: 0.4,
    });

    for await (const partialObject of partialObjectStream) {
      const parsed = schema.safeParse(partialObject);
      if (parsed.success) stream.update(parsed.data);
    }

    stream.done();
  })();

  return { object: stream.value };
}
