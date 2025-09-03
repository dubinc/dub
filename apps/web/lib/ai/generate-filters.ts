"use server";

import { VALID_ANALYTICS_FILTERS } from "@/lib/analytics/constants";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { anthropic } from "@ai-sdk/anthropic";
import { COUNTRY_CODES } from "@dub/utils";
import { streamObject } from "ai";
import { createStreamableValue } from "ai/rsc";
import z from "../zod";

export async function generateFilters(prompt: string) {
  const stream = createStreamableValue();

  const schema = analyticsQuerySchema
    .pick({
      ...(VALID_ANALYTICS_FILTERS.reduce((acc, filter) => {
        acc[filter] = true;
        return acc;
      }, {}) as any),
    })
    .merge(
      z.object({
        // polyfilling this here cause we're removing it from the main Analytics schema (to save space for our OpenAPI spec)
        country: z
          .enum(COUNTRY_CODES)
          .optional()
          .describe(
            "The country to retrieve analytics for. Must be passed as a 2-letter ISO 3166-1 country code. See https://d.to/geo for more information.",
          ),
      }),
    );

  (async () => {
    const { partialObjectStream } = await streamObject({
      model: anthropic("claude-sonnet-4-20250514"),
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
