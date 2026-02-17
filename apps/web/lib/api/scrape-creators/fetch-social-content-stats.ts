import { PlatformType } from "@dub/prisma/client";
import { scrapeCreatorsFetch } from "./client";

interface FetchSocialContentStatsParams {
  platform: PlatformType;
  url: string;
}

interface SocialContentStats {
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

export async function fetchSocialContentStats({
  platform,
  url,
}: FetchSocialContentStatsParams): Promise<SocialContentStats> {
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
      likes: 0,
      views: 0,
    };
  }

  switch (data.platform) {
    case "youtube":
      return {
        views: data.viewCountInt,
        likes: data.likeCountInt,
      };

    case "instagram":
      return {
        views: data.video_view_count,
        likes: data.edge_media_preview_like.count,
      };

    case "twitter":
      return {
        views: data.views.count,
        likes: data.legacy.favorite_count,
      };

    case "tiktok":
      return {
        views: data.stats.playCount,
        likes: data.stats.diggCount,
      };

    default:
      return {
        views: 0,
        likes: 0,
      };
  }
}
