import { SocialContent } from "@/lib/types";
import { PlatformType } from "@dub/prisma/client";
import {
  BasePlatformAdapter,
  type FetchPostsParams,
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
import { XApiError, XApiRateLimitError, xFetch } from "./x-client";
import { type XTweet, xContentSchema, xProfileSchema } from "./x-schemas";

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
  }: FetchPostsParams): Promise<PostEngagement[]> {
    const tweets = await this._getUserTweets({
      userId: platformId,
      startTime,
      endTime,
    });

    return tweets.map((tweet) => {
      const m = tweet.public_metrics;

      // Engagement rate = (likes + retweets + replies + quotes) / impressions
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
