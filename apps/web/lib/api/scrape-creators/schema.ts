import * as z from "zod/v4";

export const socialProfileSchema = z.preprocess(
  (data: unknown) => {
    if (typeof data === "object" && data !== null) {
      // Check for "account doesn't exist" response
      if (
        "message" in data &&
        typeof (data as any).message === "string" &&
        ((data as any).message.toLowerCase().includes("doesn't exist") ||
          (data as any).message.toLowerCase().includes("does not exist") ||
          (data as any).message.toLowerCase().includes("not found"))
      ) {
        return { platform: "account_not_found", ...data };
      }

      if ("description" in data && "channelId" in data) {
        return { platform: "youtube", ...data };
      }

      if (
        "data" in data &&
        typeof (data as any).data === "object" &&
        (data as any).data?.user
      ) {
        return { platform: "instagram", ...data };
      }

      if ("user" in data && "stats" in data) {
        return { platform: "tiktok", ...data };
      }

      // Twitter detection: check for rest_id and legacy fields (more reliable than is_blue_verified)
      if ("rest_id" in data && "legacy" in data) {
        return { platform: "twitter", ...data };
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
        }),
      }),
    }),

    z.object({
      platform: z.literal("tiktok"),
      user: z.object({
        id: z.string(),
        signature: z.string(),
        uniqueId: z.string(),
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
    }),
  ]),
);

export const socialContentStatsSchema = z.preprocess(
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
      if ("itemInfo" in data) {
        return {
          ...data.itemInfo.itemStruct,
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
        .nullish()
        .transform((val) => val ?? 0),
      likeCountInt: z
        .number()
        .nullish()
        .transform((val) => val ?? 0),
    }),

    z.object({
      platform: z.literal("instagram"),
      video_view_count: z
        .number()
        .nullish()
        .transform((val) => val ?? 0),
      edge_media_preview_like: z.object({
        count: z
          .number()
          .nullish()
          .transform((val) => val ?? 0),
      }),
    }),

    z.object({
      platform: z.literal("twitter"),
      views: z.object({
        count: z.z
          .string()
          .nullish()
          .transform((val) => (val == null ? 0 : Number(val))),
      }),
      legacy: z.object({
        favorite_count: z
          .number()
          .nullish()
          .transform((val) => val ?? 0),
      }),
    }),

    z.object({
      platform: z.literal("tiktok"),
      stats: z.object({
        playCount: z
          .number()
          .nullish()
          .transform((val) => val ?? 0),
        diggCount: z
          .number()
          .nullish()
          .transform((val) => val ?? 0),
      }),
    }),
  ]),
);
