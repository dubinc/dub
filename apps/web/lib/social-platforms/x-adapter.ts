import { SocialContent } from "@/lib/types";
import { createFetch, createSchema } from "@better-fetch/fetch";
import { PlatformType } from "@dub/prisma/client";
import * as z from "zod/v4";
import {
  BasePlatformAdapter,
  type FetchEngagementParams,
  type PostEngagement,
  type SocialProfile,
} from "./base-adapter";
import { checkXApiRateLimit } from "./rate-limiter";
import {
  AccountNotFoundError,
  ContentNotFoundError,
  isAccountNotFound,
  scrapeCreatorsFetch,
} from "./scrape-creators";

const xTweetSchema = z.object({
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

const xApiErrorSchema = z.object({
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

const xContentSchema = z.object({
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

const xProfileSchema = z.object({
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
  defaultError: xApiErrorSchema,
  onError: ({ error }) => {
    console.error("[X API] Error", error);
  },
});

type XTweet = z.infer<typeof xTweetSchema>;
type XApiErrorResponse = z.infer<typeof xApiErrorSchema>;

export class XApiError extends Error {
  status: number;
  statusText: string;
  title?: string;
  detail?: string;
  type?: string;
  errors?: XApiErrorResponse["errors"];

  constructor(
    error: XApiErrorResponse & { status: number; statusText: string },
  ) {
    const message =
      error.detail ||
      error.errors?.map((e) => e.message).join("; ") ||
      error.statusText;

    super(message);
    this.name = "XApiError";
    this.status = error.status;
    this.statusText = error.statusText;
    this.title = error.title;
    this.detail = error.detail;
    this.type = error.type;
    this.errors = error.errors;
  }
}

class XApiRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XApiRateLimitError";
  }
}

export class XAdapter extends BasePlatformAdapter {
  platform: PlatformType = "twitter";

  async fetchProfile(handle: string): Promise<SocialProfile> {
    const { data: raw, error } = await scrapeCreatorsFetch(
      "/v1/:platform/:handleType",
      {
        params: {
          platform: "twitter",
          handleType: "profile",
        },
        query: {
          handle,
        },
      },
    );

    if (error) {
      throw new Error(
        "We were unable to retrieve your social media profile. Please try again.",
      );
    }

    if (isAccountNotFound(raw)) {
      throw new AccountNotFoundError(
        (raw as any).message || "Account doesn't exist",
      );
    }

    const data = xProfileSchema.parse(raw);

    return {
      description: data.legacy.description,
      platformId: data.rest_id,
      subscribers: BigInt(data.legacy.followers_count),
      posts: BigInt(data.legacy.statuses_count),
      views: BigInt(0),
      avatarUrl: data.avatar.image_url,
    };
  }

  async fetchPost(url: string): Promise<SocialContent> {
    const { data: raw, error } = await scrapeCreatorsFetch(
      "/:version/:platform/:contentType",
      {
        params: {
          version: "v1",
          platform: "twitter",
          contentType: "tweet",
        },
        query: {
          url,
        },
      },
    );

    if (error) {
      throw new ContentNotFoundError(
        error.status ?? 500,
        error.statusText ?? "Unknown error",
      );
    }

    const data = xContentSchema.parse(raw);

    return {
      publishedAt: new Date(data.legacy.created_at),
      handle: data.core.user_results.result.core.screen_name,
      platformId: null,
      views: data.views.count,
      likes: data.legacy.favorite_count,
      title: null,
      description: data.legacy.full_text ?? null,
      thumbnailUrl: null,
    };
  }

  async fetchPosts({
    platformId,
    startTime,
    endTime,
  }: FetchEngagementParams): Promise<PostEngagement[]> {
    const tweets = await this._getUserTweets({
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
        title: tweet.text,
        views: m.impression_count,
        likes: m.like_count,
        comments: m.reply_count + m.quote_count,
        engagementRate,
      };
    });
  }

  private async _getUserTweets({
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
        throw new XApiError(error);
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
}
