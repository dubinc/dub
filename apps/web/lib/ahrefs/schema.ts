import * as z from "zod/v4";

// GET /v3/public/domain-rating-free query params
export const getDomainRatingInputSchema = z.object({
  target: z.string(),
  output: z.literal("json"),
});

// GET /v3/public/domain-rating-free response
export const getDomainRatingOutputSchema = z.object({
  domain_rating: z.object({
    domain_rating: z.number(),
  }),
});
