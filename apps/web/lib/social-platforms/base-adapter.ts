import { SocialContent } from "@/lib/types";
import { PartnerPlatform, PlatformType } from "@dub/prisma/client";

export type SocialProfile = Pick<
  PartnerPlatform,
  "platformId" | "subscribers" | "posts" | "views" | "avatarUrl"
> & {
  description: string | null;
};

export interface DailyEngagement {
  date: Date;
  totalPosts: number;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  engagementRate: number;
}

export interface PostEngagement {
  postId: string;
  publishedAt: Date;
  title: string | null;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
}

export interface FetchPostsParams {
  platformId: string;
  identifier: string;
  startTime: Date;
  endTime: Date;
}

export abstract class BasePlatformAdapter {
  abstract platform: PlatformType;

  abstract fetchPosts(params: FetchPostsParams): Promise<PostEngagement[]>;

  abstract fetchPost(url: string): Promise<SocialContent>;

  abstract fetchProfile(handle: string): Promise<SocialProfile>;

  /**
   * Groups posts by calendar day (UTC) and aggregates metrics.
   * Engagement rate is an impression-weighted average across posts.
   */
  calculateDailyEngagement(posts: PostEngagement[]): DailyEngagement[] {
    if (posts.length === 0) {
      return [];
    }

    const dayMap = new Map<string, PostEngagement[]>();

    for (const post of posts) {
      const dayKey = post.publishedAt.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const existing = dayMap.get(dayKey);

      if (existing) {
        existing.push(post);
      } else {
        dayMap.set(dayKey, [post]);
      }
    }

    const results: DailyEngagement[] = [];

    for (const [dayKey, dayPosts] of dayMap) {
      let totalImpressions = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalEngagements = 0;

      for (const post of dayPosts) {
        totalImpressions += post.views;
        totalLikes += post.likes;
        totalComments += post.comments;
        // engagementRate * views = total engagements (including platform-specific
        // signals like retweets), so weighted sum preserves the per-post formula
        totalEngagements += post.engagementRate * post.views;
      }

      const engagementRate =
        totalImpressions > 0 ? totalEngagements / totalImpressions : 0;

      results.push({
        date: new Date(`${dayKey}T00:00:00.000Z`),
        totalPosts: dayPosts.length,
        totalImpressions,
        totalLikes,
        totalComments,
        engagementRate,
      });
    }

    return results.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
