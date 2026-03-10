import * as z from "zod/v4";

export const xTweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  created_at: z.string(),
  public_metrics: z.object({
    bookmark_count: z.number(),
    impression_count: z.number(),
    like_count: z.number(),
    quote_count: z.number(),
    reply_count: z.number(),
    retweet_count: z.number(),
  }),
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

export const xApiErrorSchema = z.object({
  errors: z
    .array(
      z.object({
        parameters: z.record(z.string(), z.unknown()).optional(),
        message: z.string(),
      }),
    )
    .optional(),
  title: z.string().optional(),
  detail: z.string().optional(),
  type: z.string().optional(),
});

export const xContentSchema = z.object({
  core: z.object({
    user_results: z.object({
      result: z.object({
        core: z.object({
          screen_name: z.string(),
        }),
      }),
    }),
  }),
  views: z.object({
    count: z
      .string()
      .nullable()
      .transform((val) => (val == null ? 0 : Number(val))),
  }),
  legacy: z.object({
    created_at: z.string(),
    favorite_count: z
      .number()
      .nullable()
      .transform((val) => val ?? 0),
    full_text: z.string().optional(),
  }),
});

export const xProfileSchema = z.object({
  rest_id: z.string(),
  legacy: z.object({
    description: z.string(),
    followers_count: z
      .number()
      .nullish()
      .transform((val) => val ?? 0),
    statuses_count: z
      .number()
      .nullish()
      .transform((val) => val ?? 0),
  }),
  avatar: z.object({
    image_url: z.url().nullish().default(null),
  }),
});

export type XTweet = z.infer<typeof xTweetSchema>;
export type XApiErrorResponse = z.infer<typeof xApiErrorSchema>;
