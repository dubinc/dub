import { SocialContent } from "@/lib/types";
import { PlatformType } from "@dub/prisma/client";
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

export async function getSocialContent({
  platform,
  url,
}: GetSocialContentStatsParams): Promise<SocialContent> {
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
      title: null,
      description: null,
      thumbnailUrl: null,
    };
  }

  switch (data.platform) {
    case "youtube": {
      return {
        publishedAt: new Date(data.publishDateText),
        handle: data.channel.handle,
        platformId: data.channel.id,
        views: data.viewCountInt,
        likes: data.likeCountInt,
        title: data.title ?? null,
        description: data.description ?? null,
        thumbnailUrl: data.thumbnailUrl ?? null,
      };
    }

    case "instagram": {
      const thumbnailUrl = data.display_url ?? data.thumbnail_src ?? null;
      const carouselEdges = data.edge_sidecar_to_children?.edges ?? [];

      const thumbnailUrls =
        carouselEdges.length > 0
          ? carouselEdges
              .map(
                (edge: {
                  node: { display_url?: string; thumbnail_src?: string };
                }) => edge.node.display_url ?? edge.node.thumbnail_src ?? "",
              )
              .filter(Boolean)
          : undefined;

      // Find the media type based on the data
      let mediaType: "image" | "video" | "carousel" | undefined;

      if (data.__typename === "GraphVideo") {
        mediaType = "video";
      } else if (
        data.__typename === "GraphSidecar" ||
        (thumbnailUrls !== undefined && thumbnailUrls.length > 0)
      ) {
        mediaType = "carousel";
      } else if (data.__typename === "GraphImage") {
        mediaType = "image";
      } else if (thumbnailUrls === undefined && data.video_view_count > 0) {
        mediaType = "video";
      }

      return {
        publishedAt: new Date(data.taken_at_timestamp * 1000),
        handle: data.owner.username,
        platformId: null,
        views: data.video_view_count,
        likes: data.edge_media_preview_like.count,
        title: null,
        description: data.edge_media_to_caption?.edges?.[0]?.node?.text ?? null,
        thumbnailUrl,
        mediaType,
        thumbnailUrls,
      };
    }

    case "twitter": {
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

    case "tiktok": {
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

    default:
      return {
        publishedAt: null,
        handle: null,
        platformId: null,
        views: 0,
        likes: 0,
        title: null,
        description: null,
        thumbnailUrl: null,
      };
  }
}
