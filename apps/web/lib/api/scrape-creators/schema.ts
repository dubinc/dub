import * as z from "zod/v4";

export const socialProfileSchema = z.preprocess(
  (data: any) => {
    if (typeof data === "object" && data !== null) {
      // Check for "account doesn't exist" response
      if (
        "message" in data &&
        typeof data.message === "string" &&
        (data.message.toLowerCase().includes("doesn't exist") ||
          data.message.toLowerCase().includes("does not exist") ||
          data.message.toLowerCase().includes("not found"))
      ) {
        return {
          ...data,
          platform: "account_not_found",
        };
      }

      // YouTube detection
      if ("description" in data && "channelId" in data) {
        return {
          ...data,
          platform: "youtube",
        };
      }

      // Instagram detection
      if ("data" in data && typeof data.data === "object" && data.data?.user) {
        return {
          ...data,
          platform: "instagram",
        };
      }

      // TikTok detection
      if ("user" in data && "stats" in data) {
        return {
          ...data,
          platform: "tiktok",
        };
      }

      // Twitter detection: check for rest_id and legacy fields (more reliable than is_blue_verified)
      if ("rest_id" in data && "legacy" in data) {
        return {
          ...data,
          platform: "twitter",
        };
      }
    }

    return data;
  },

  z.discriminatedUnion("platform", [
    z.object({
      platform: z.literal("account_not_found"),
      handle: z.string().optional(),
      message: z.string().optional(),
    }),

    z.object({
      platform: z.literal("youtube"),
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
    }),

    z.object({
      platform: z.literal("instagram"),
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
    }),

    z.object({
      platform: z.literal("tiktok"),
      user: z.object({
        id: z.string(),
        signature: z.string(),
        uniqueId: z.string(),
        avatarThumb: z.url().nullish().default(null),
      }),
      stats: z.object({
        followerCount: z
          .number()
          .nullish()
          .transform((val) => val ?? 0),
        videoCount: z
          .number()
          .nullish()
          .transform((val) => val ?? 0),
        heartCount: z
          .number()
          .nullish()
          .transform((val) => val ?? 0),
      }),
    }),

    z.object({
      platform: z.literal("twitter"),
      rest_id: z.string(),
      legacy: z.object({
        description: z.string(),
        followers_count: z
          .number()
          .nullish()
          .transform((val) => val ?? 0),
        statuses_count: z
          .number()
          .nullish()
          .transform((val) => val ?? 0),
      }),
      avatar: z.object({
        image_url: z.url().nullish().default(null),
      }),
    }),
  ]),
);

export const socialContentSchema = z.preprocess(
  (data: any) => {
    if (typeof data === "object" && data !== null) {
      // YouTube detection
      if ("viewCountInt" in data && "likeCountInt" in data) {
        return {
          ...data,
          platform: "youtube",
        };
      }

      // Instagram detection
      if ("data" in data && "xdt_shortcode_media" in data.data) {
        return {
          ...data.data.xdt_shortcode_media,
          platform: "instagram",
        };
      }

      // Twitter detection
      if ("__typename" in data && data.__typename === "Tweet") {
        return {
          ...data,
          platform: "twitter",
        };
      }

      // TikTok detection
      if ("aweme_detail" in data) {
        return {
          ...data.aweme_detail,
          platform: "tiktok",
        };
      }
    }

    return data;
  },
  z.discriminatedUnion("platform", [
    z.object({
      platform: z.literal("youtube"),
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
    }),

    z.object({
      platform: z.literal("instagram"),
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
    }),

    z.object({
      platform: z.literal("twitter"),
      core: z.object({
        user_results: z.object({
          result: z.object({
            core: z.object({
              screen_name: z.string(),
            }),
          }),
        }),
      }),
      views: z.object({
        count: z
          .string()
          .nullable()
          .transform((val) => (val == null ? 0 : Number(val))),
      }),
      legacy: z.object({
        created_at: z.string(),
        favorite_count: z
          .number()
          .nullable()
          .transform((val) => val ?? 0),
        full_text: z.string().optional(),
      }),
    }),

    z.object({
      platform: z.literal("tiktok"),
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
    }),
  ]),
);
