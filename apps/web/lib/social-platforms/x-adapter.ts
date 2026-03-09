import { createFetch, createSchema } from "@better-fetch/fetch";
import { PlatformType } from "@dub/prisma/client";
import * as z from "zod/v4";
import {
  BasePlatformAdapter,
  type FetchEngagementParams,
  type PostEngagement,
} from "./base-adapter";
import { checkXApiRateLimit } from "./rate-limiter";

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

const xTweetsResponseSchema = z.object({
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

type XTweet = z.infer<typeof xTweetSchema>;

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

export class XAdapter extends BasePlatformAdapter {
  platform: PlatformType = "twitter";

  private async getUserTweets({
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

  async fetchPosts({
    platformId,
    startTime,
    endTime,
  }: FetchEngagementParams): Promise<PostEngagement[]> {
    const tweets = await this.getUserTweets({
      userId: platformId,
      startTime,
      endTime,
    });

    return tweets.map((tweet) => {
      const m = tweet.public_metrics;
      const totalEngagements =
        m.like_count + m.retweet_count + m.reply_count + m.quote_count;
      const engagementRate =
        m.impression_count > 0 ? totalEngagements / m.impression_count : 0;

      return {
        postId: tweet.id,
        publishedAt: new Date(tweet.created_at),
        title: tweet.text.slice(0, 200),
        views: m.impression_count,
        likes: m.like_count,
        comments: m.reply_count + m.quote_count,
        engagementRate,
      };
    });
  }
}
