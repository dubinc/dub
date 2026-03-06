import { PlatformType } from "@dub/prisma/client";

export interface DailyEngagement {
  date: Date;
  totalPosts: number;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  engagementRate: number;
}

export interface FetchEngagementParams {
  platformId: string;
  identifier: string;
  startTime: Date;
  endTime: Date;
}

export abstract class BasePlatformAdapter {
  abstract platform: PlatformType;

  abstract fetchEngagement(
    params: FetchEngagementParams,
  ): Promise<DailyEngagement[]>;
}
