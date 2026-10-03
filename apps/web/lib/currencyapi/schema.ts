import * as z from "zod/v4";

// GET /v3/latest response
export const getLatestOutputSchema = z.object({
  data: z.record(
    z.string(),
    z.object({
      value: z.number(),
    }),
  ),
});
