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
