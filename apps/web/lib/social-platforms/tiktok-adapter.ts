import { SocialContent } from "@/lib/types";
import { PlatformType } from "@dub/prisma/client";
import * as z from "zod/v4";
import {
  BasePlatformAdapter,
  type FetchEngagementParams,
  type PostEngagement,
} from "./base-adapter";
import {
  ScrapeCreatorsContentError,
  scrapeCreatorsFetch,
} from "./scrape-creators";

const tiktokContentSchema = z.object({
  create_time_utc: z.string(),
  author: z.object({
    unique_id: z.string(),
  }),
  statistics: z.object({
    play_count: z
      .number()
      .nullable()
      .transform((val) => val ?? 0),
    digg_count: z
      .number()
      .nullable()
      .transform((val) => val ?? 0),
  }),
  desc: z.string().optional(),
  video: z
    .object({
      cover: z
        .object({
          url_list: z.array(z.string()),
        })
        .optional(),
    })
    .optional(),
});

export class TikTokAdapter extends BasePlatformAdapter {
  platform: PlatformType = "tiktok";

  async fetchPost(url: string): Promise<SocialContent> {
    const { data: raw, error } = await scrapeCreatorsFetch(
      "/:version/:platform/:contentType",
      {
        params: { version: "v2", platform: "tiktok", contentType: "video" },
        query: { url },
      },
    );

    if (error) {
      throw new ScrapeCreatorsContentError(
        error.status ?? 500,
        error.statusText ?? "Unknown error",
      );
    }

    // TikTok response wraps content in aweme_detail
    const unwrapped =
      typeof raw === "object" &&
      raw !== null &&
      "aweme_detail" in (raw as any)
        ? (raw as any).aweme_detail
        : raw;

    const data = tiktokContentSchema.parse(unwrapped);

    return {
      publishedAt: new Date(data.create_time_utc),
      handle: data.author.unique_id,
      platformId: null,
      views: data.statistics.play_count,
      likes: data.statistics.digg_count,
      title: null,
      description: data.desc ?? null,
      thumbnailUrl: data.video?.cover?.url_list?.[0] ?? null,
    };
  }

  async fetchPosts(_params: FetchEngagementParams): Promise<PostEngagement[]> {
    return [];
  }
}
