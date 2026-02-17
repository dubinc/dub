import { PlatformType } from "@dub/prisma/client";
import { scrapeCreatorsFetch } from "./client";

interface GetSocialContentStatsParams {
  platform: PlatformType;
  url: string;
}

interface SocialContentStats {
  publishedAt: Date | null;
  platformId: string | null;
  handle: string | null;
  likes: number;
  views: number;
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

  const { data, error } = await scrapeCreatorsFetch(
    "/v1/:platform/:contentType",
    {
      params: {
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
        publishedAt: null,
        handle: null,
        platformId: null,
        views: data.video_view_count,
        likes: data.edge_media_preview_like.count,
      };

    case "twitter":
      return {
        publishedAt: null,
        handle: null,
        platformId: null,
        views: data.views.count,
        likes: data.legacy.favorite_count,
      };

    case "tiktok":
      return {
        publishedAt: null,
        handle: null,
        platformId: null,
        views: data.stats.playCount,
        likes: data.stats.diggCount,
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
