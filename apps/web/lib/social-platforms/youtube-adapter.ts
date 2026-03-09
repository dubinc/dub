import { SocialContent } from "@/lib/types";
import { PlatformType } from "@dub/prisma/client";
import * as z from "zod/v4";
import {
  BasePlatformAdapter,
  type FetchEngagementParams,
  type PostEngagement,
  type SocialProfile,
} from "./base-adapter";
import {
  AccountNotFoundError,
  ContentNotFoundError,
  isAccountNotFound,
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

const youtubeProfileSchema = z.object({
  description: z.string(),
  channelId: z.string(),
  videoCount: z
    .number()
    .nullish()
    .transform((val) => val ?? 0),
  subscriberCount: z
    .number()
    .nullish()
    .transform((val) => val ?? 0),
  viewCount: z
    .number()
    .nullish()
    .transform((val) => val ?? 0),
  avatar: z.object({
    image: z.object({
      sources: z.array(
        z.object({
          url: z.url(),
          width: z.number(),
          height: z.number(),
        }),
      ),
    }),
  }),
});

export class YouTubeAdapter extends BasePlatformAdapter {
  platform: PlatformType = "youtube";

  async fetchProfile(handle: string): Promise<SocialProfile> {
    const { data: raw, error } = await scrapeCreatorsFetch(
      "/v1/:platform/:handleType",
      {
        params: {
          platform: "youtube",
          handleType: "channel",
        },
        query: {
          handle,
        },
      },
    );

    if (error) {
      throw new Error(
        "We were unable to retrieve your social media profile. Please try again.",
      );
    }

    if (isAccountNotFound(raw)) {
      throw new AccountNotFoundError(
        (raw as any).message || "Account doesn't exist",
      );
    }

    const data = youtubeProfileSchema.parse(raw);

    const largestAvatar = data.avatar.image.sources.sort(
      (a, b) => b.width - a.width,
    )[0];

    return {
      description: data.description,
      platformId: data.channelId,
      subscribers: BigInt(data.subscriberCount),
      posts: BigInt(data.videoCount),
      views: BigInt(data.viewCount),
      avatarUrl: largestAvatar?.url ?? null,
    };
  }

  async fetchPost(url: string): Promise<SocialContent> {
    const { data: raw, error } = await scrapeCreatorsFetch(
      "/:version/:platform/:contentType",
      {
        params: {
          version: "v1",
          platform: "youtube",
          contentType: "video",
        },
        query: {
          url,
        },
      },
    );

    if (error) {
      throw new ContentNotFoundError(
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
