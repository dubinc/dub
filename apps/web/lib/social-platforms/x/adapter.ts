import { PlatformType } from "@dub/prisma/client";
import {
  BasePlatformAdapter,
  type FetchEngagementParams,
  type PostEngagement,
} from "../base-adapter";
import { getUserTweets } from "./client";

export class XAdapter extends BasePlatformAdapter {
  platform: PlatformType = "twitter";

  async fetchPosts({
    platformId,
    startTime,
    endTime,
  }: FetchEngagementParams): Promise<PostEngagement[]> {
    const tweets = await getUserTweets({
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
