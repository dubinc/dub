import { PlatformType } from "@dub/prisma/client";
import { startOfDay } from "date-fns";
import {
  BasePlatformAdapter,
  type DailyEngagement,
  type FetchEngagementParams,
} from "../base-adapter";
import { getUserTweets } from "./client";
import type { XTweet } from "./schema";

export class XAdapter extends BasePlatformAdapter {
  platform: PlatformType = "twitter";

  async fetchEngagement({
    platformId,
    startTime,
    endTime,
  }: FetchEngagementParams): Promise<DailyEngagement[]> {
    const tweets = await getUserTweets({
      userId: platformId,
      startTime,
      endTime,
    });

    if (tweets.length === 0) {
      return [
        {
          date: startOfDay(startTime),
          totalPosts: 0,
          totalImpressions: 0,
          totalLikes: 0,
          totalComments: 0,
          engagementRate: 0,
        },
      ];
    }

    // Group tweets by calendar day (UTC)
    const dayMap = new Map<string, XTweet[]>();

    for (const tweet of tweets) {
      const dayKey = tweet.created_at.slice(0, 10); // "YYYY-MM-DD"
      const existing = dayMap.get(dayKey);

      if (existing) {
        existing.push(tweet);
      } else {
        dayMap.set(dayKey, [tweet]);
      }
    }

    // Aggregate per day
    const results: DailyEngagement[] = [];

    for (const [dayKey, dayTweets] of dayMap) {
      let totalImpressions = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalRetweets = 0;
      let totalQuotes = 0;

      for (const tweet of dayTweets) {
        const m = tweet.public_metrics;
        totalImpressions += m.impression_count;
        totalLikes += m.like_count;
        totalComments += m.reply_count;
        totalRetweets += m.retweet_count;
        totalQuotes += m.quote_count;
      }

      // Engagement rate = (likes + retweets + replies + quotes) / impressions
      const totalEngagements =
        totalLikes + totalRetweets + totalComments + totalQuotes;
      const engagementRate =
        totalImpressions > 0 ? totalEngagements / totalImpressions : 0;

      results.push({
        date: new Date(`${dayKey}T00:00:00.000Z`),
        totalPosts: dayTweets.length,
        totalImpressions,
        totalLikes,
        totalComments,
        engagementRate,
      });
    }

    return results.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
