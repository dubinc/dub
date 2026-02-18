import { SocialContentStats } from "@/lib/types";
import { PlatformType } from "@dub/prisma/client";
import "server-only";
import { scrapeCreatorsFetch } from "./client";

interface GetSocialContentStatsParams {
  platform: PlatformType;
  url: string;
}

const PLATFORM_CONTENT_TYPE: Record<
  Exclude<PlatformType, "website" | "linkedin">,
  "post" | "video" | "tweet"
> = {
  youtube: "video",
  instagram: "post",
  twitter: "tweet",
  tiktok: "video",
};

export async function getSocialContentStats({
  platform,
  url,
}: GetSocialContentStatsParams): Promise<SocialContentStats> {
  const contentType = PLATFORM_CONTENT_TYPE[platform];
  const version = platform === "tiktok" ? "v2" : "v1";

  const { data, error } = await scrapeCreatorsFetch(
    "/:version/:platform/:contentType",
    {
      params: {
        version,
        platform,
        contentType,
      },
      query: {
        url,
      },
    },
  );

  if (error) {
    return {
      publishedAt: null,
      platformId: null,
      handle: null,
      likes: 0,
      views: 0,
    };
  }

  switch (data.platform) {
    case "youtube":
      return {
        publishedAt: new Date(data.publishDateText),
        handle: data.channel.handle,
        platformId: data.channel.id,
        views: data.viewCountInt,
        likes: data.likeCountInt,
      };

    case "instagram":
      return {
        publishedAt: new Date(data.taken_at_timestamp * 1000),
        handle: data.owner.username,
        platformId: null,
        views: data.video_view_count,
        likes: data.edge_media_preview_like.count,
      };

    case "twitter":
      return {
        publishedAt: new Date(data.legacy.created_at),
        handle: data.core.user_results.result.core.screen_name,
        platformId: null,
        views: data.views.count,
        likes: data.legacy.favorite_count,
      };

    case "tiktok":
      return {
        publishedAt: new Date(data.create_time_utc),
        handle: data.author.unique_id,
        platformId: null,
        views: data.statistics.play_count,
        likes: data.statistics.digg_count,
      };

    default:
      return {
        publishedAt: null,
        handle: null,
        platformId: null,
        views: 0,
        likes: 0,
      };
  }
}
