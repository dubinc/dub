import * as z from "zod/v4";

const xPublicMetricsSchema = z.object({
  bookmark_count: z.number(),
  impression_count: z.number(),
  like_count: z.number(),
  quote_count: z.number(),
  reply_count: z.number(),
  retweet_count: z.number(),
});

const xTweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  created_at: z.string(),
  public_metrics: xPublicMetricsSchema,
});

export const xTweetsResponseSchema = z.object({
  data: z.array(xTweetSchema).optional().default([]),
  meta: z
    .object({
      result_count: z.number(),
      next_token: z.string().optional(),
      oldest_id: z.string().optional(),
      newest_id: z.string().optional(),
    })
    .optional()
    .default({ result_count: 0 }),
});

export type XTweet = z.infer<typeof xTweetSchema>;
