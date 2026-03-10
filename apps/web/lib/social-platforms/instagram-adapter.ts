import { SocialContent } from "@/lib/types";
import { PlatformType } from "@dub/prisma/client";
import * as z from "zod/v4";
import {
  BasePlatformAdapter,
  type FetchPostsParams,
  type PostEngagement,
  type SocialProfile,
} from "./base-adapter";
import {
  AccountNotFoundError,
  ContentNotFoundError,
  isAccountNotFound,
  scrapeCreatorsFetch,
} from "./scrape-creators";

const instagramContentSchema = z.object({
  taken_at_timestamp: z.number(),
  owner: z.object({
    username: z.string(),
  }),
  video_view_count: z
    .number()
    .nullish()
    .transform((val) => val ?? 0),
  edge_media_preview_like: z.object({
    count: z
      .number()
      .nullable()
      .transform((val) => val ?? 0),
  }),
  edge_media_to_caption: z
    .object({
      edges: z.array(
        z.object({
          node: z.object({ text: z.string() }),
        }),
      ),
    })
    .optional(),
  display_url: z.string().optional(),
  thumbnail_src: z.string().optional(),
  __typename: z.string().optional(),
  edge_sidecar_to_children: z
    .object({
      edges: z.array(
        z.object({
          node: z.object({
            display_url: z.string().optional(),
            thumbnail_src: z.string().optional(),
          }),
        }),
      ),
    })
    .optional(),
});

type InstagramContent = z.infer<typeof instagramContentSchema>;

const instagramProfileSchema = z.object({
  data: z.object({
    user: z.object({
      biography: z.string(),
      edge_followed_by: z.object({
        count: z
          .number()
          .nullish()
          .transform((val) => val ?? 0),
      }),
      edge_owner_to_timeline_media: z.object({
        count: z
          .number()
          .nullish()
          .transform((val) => val ?? 0),
      }),
      profile_pic_url: z.url().nullish().default(null),
    }),
  }),
});

export class InstagramAdapter extends BasePlatformAdapter {
  platform: PlatformType = "instagram";

  async fetchProfile(handle: string): Promise<SocialProfile> {
    const { data: raw, error } = await scrapeCreatorsFetch(
      "/v1/:platform/:handleType",
      {
        params: {
          platform: "instagram",
          handleType: "profile",
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

    const data = instagramProfileSchema.parse(raw);

    return {
      description: data.data.user.biography,
      platformId: null,
      subscribers: BigInt(data.data.user.edge_followed_by.count),
      posts: BigInt(data.data.user.edge_owner_to_timeline_media.count),
      views: BigInt(0),
      avatarUrl: data.data.user.profile_pic_url,
    };
  }

  async fetchPost(url: string): Promise<SocialContent> {
    const { data: raw, error } = await scrapeCreatorsFetch(
      "/:version/:platform/:contentType",
      {
        params: {
          version: "v1",
          platform: "instagram",
          contentType: "post",
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

    // Instagram response wraps content in data.xdt_shortcode_media
    const unwrapped =
      typeof raw === "object" &&
      raw !== null &&
      "data" in raw &&
      typeof (raw as any).data === "object" &&
      "xdt_shortcode_media" in (raw as any).data
        ? (raw as any).data.xdt_shortcode_media
        : raw;

    const data = instagramContentSchema.parse(unwrapped);

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

    const mediaType = this.detectMediaType(data, thumbnailUrls);

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

  private detectMediaType(
    data: InstagramContent,
    thumbnailUrls: string[] | undefined,
  ): "image" | "video" | "carousel" | undefined {
    if (data.__typename === "GraphVideo") {
      return "video";
    }

    if (
      data.__typename === "GraphSidecar" ||
      (thumbnailUrls !== undefined && thumbnailUrls.length > 0)
    ) {
      return "carousel";
    }

    if (data.__typename === "GraphImage") {
      return "image";
    }

    if (thumbnailUrls === undefined && data.video_view_count > 0) {
      return "video";
    }

    return undefined;
  }

  async fetchPosts(_params: FetchPostsParams): Promise<PostEngagement[]> {
    return [];
  }
}
