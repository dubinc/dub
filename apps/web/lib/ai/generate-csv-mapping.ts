"use server";

import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { createStreamableValue } from "ai/rsc";
import { z } from "zod";

export async function generateCsvMapping(
  fieldColumns: string[],
  firstRows: Record<string, string>[],
) {
  const stream = createStreamableValue();

  (async () => {
    const { partialObjectStream } = await streamObject({
      model: anthropic("claude-3-sonnet-20240229"),
      schema: z.object({
        domain: z
          .string()
          .optional()
          .describe(
            "The domain of the shortlink. Can be mapped to a full URL if there is not a separate domain column",
          ),
        key: z
          .string()
          .optional()
          .describe(
            "The key/slug of the shortlink (a shortlink is: https://[domain]/[key]). Can be mapped to a full URL if there is not a separate key column",
          ),
        tags: z
          .string()
          .optional()
          .describe(
            "A comma-separated list of tags for shortlink organization (NOT to be mapped to a description).",
          ),
        url: z.string().optional().describe("The full URL of the shortlink"),
        title: z.string().optional().describe("The title of the shortlink"),
        description: z
          .string()
          .optional()
          .describe("The description of the shortlink"),
      }),
      prompt:
        `The following columns are the headings from a CSV import file for importing a company's short links. ` +
        `Map these column names to the correct fields in our database (domain, key, url, title, description) by providing the matching column name for each field.` +
        `You may also consult the first few rows of data to help you make the mapping, but you are mapping the columns, not the values. ` +
        `If you are not sure or there is no matching column, omit the value.\n\n` +
        `Columns:\n${fieldColumns.join(",")}\n\n` +
        `First few rows of data:\n` +
        firstRows.map((row) => JSON.stringify(row)).join("\n"),
      temperature: 0.2,
    });

    for await (const partialObject of partialObjectStream) {
      stream.update(partialObject);
    }

    stream.done();
  })();

  return { object: stream.value };
}
