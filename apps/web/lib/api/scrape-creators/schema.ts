import * as z from "zod/v4";

export const profileResponseSchema = z.preprocess(
  (data: unknown) => {
    if (typeof data === "object" && data !== null) {
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
      platform: z.literal("youtube"),
      description: z.string(),
      channelId: z.string(),
      videoCount: z.number(),
      subscriberCount: z.number(),
      viewCount: z.number(),
    }),

    z.object({
      platform: z.literal("instagram"),
      data: z.object({
        user: z.object({
          biography: z.string(),
          edge_followed_by: z.object({ count: z.number() }),
          edge_owner_to_timeline_media: z.object({ count: z.number() }),
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
        followerCount: z.number(),
        videoCount: z.number(),
        heartCount: z.number(),
      }),
    }),

    z.object({
      platform: z.literal("twitter"),
      rest_id: z.string(),
      legacy: z.object({
        description: z.string(),
        followers_count: z.number(),
        statuses_count: z.number(),
      }),
    }),
  ]),
);

export type ProfileResponse = z.infer<typeof profileResponseSchema>;
