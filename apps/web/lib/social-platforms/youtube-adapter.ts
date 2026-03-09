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

const youtubeContentSchema = z.object({
  publishDateText: z.string(),
  channel: z.object({
    id: z.string(),
    handle: z.string(),
  }),
  viewCountInt: z
    .number()
    .nullable()
    .transform((val) => val ?? 0),
  likeCountInt: z
    .number()
    .nullable()
    .transform((val) => val ?? 0),
  title: z.string().nullish(),
  description: z.string().nullish(),
  thumbnailUrl: z.string().nullish(),
});

export class YouTubeAdapter extends BasePlatformAdapter {
  platform: PlatformType = "youtube";

  async fetchPost(url: string): Promise<SocialContent> {
    const { data: raw, error } = await scrapeCreatorsFetch(
      "/:version/:platform/:contentType",
      {
        params: { version: "v1", platform: "youtube", contentType: "video" },
        query: { url },
      },
    );

    if (error) {
      throw new ScrapeCreatorsContentError(
        error.status ?? 500,
        error.statusText ?? "Unknown error",
      );
    }

    const data = youtubeContentSchema.parse(raw);

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

  async fetchPosts(_params: FetchEngagementParams): Promise<PostEngagement[]> {
    return [];
  }
}
