import { createFetch, createSchema } from "@better-fetch/fetch";
import * as z from "zod/v4";
import { checkXApiRateLimit } from "../rate-limiter";
import { type XTweet, xTweetsResponseSchema } from "./schema";

const xFetch = createFetch({
  baseURL: "https://api.x.com/2",
  headers: {
    Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}`,
  },
  schema: createSchema(
    {
      "/users/:userId/tweets": {
        method: "get",
        params: z.object({
          userId: z.string(),
        }),
        query: z.object({
          "tweet.fields": z.string(),
          exclude: z.string().optional(),
          start_time: z.string(),
          end_time: z.string(),
          max_results: z.string(),
          pagination_token: z.string().optional(),
        }),
        output: xTweetsResponseSchema,
      },
    },
    {
      strict: true,
    },
  ),
  onError: ({ error }) => {
    console.error("[X API] Error", error);
  },
});

export async function getUserTweets({
  userId,
  startTime,
  endTime,
}: {
  userId: string;
  startTime: Date;
  endTime: Date;
}): Promise<XTweet[]> {
  const allTweets: XTweet[] = [];
  let paginationToken: string | undefined;

  for (let page = 0; page < 5; page++) {
    const { success } = await checkXApiRateLimit();

    if (!success) {
      throw new XApiRateLimitError("X API rate limit exceeded");
    }

    const { data, error } = await xFetch("/users/:userId/tweets", {
      params: {
        userId,
      },
      query: {
        "tweet.fields": "public_metrics,created_at,text",
        exclude: "replies,retweets",
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        max_results: "100",
        ...(paginationToken && { pagination_token: paginationToken }),
      },
    });

    if (error) {
      throw new XApiError(`Failed to fetch tweets for user ${userId}`, error);
    }

    if (data.data.length > 0) {
      allTweets.push(...data.data);
    }

    paginationToken = data.meta.next_token;

    if (!paginationToken) {
      break;
    }
  }

  return allTweets;
}

export class XApiError extends Error {
  cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "XApiError";
    this.cause = cause;
  }
}

export class XApiRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XApiRateLimitError";
  }
}
