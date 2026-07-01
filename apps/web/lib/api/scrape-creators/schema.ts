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
          data.message.toLowerCase().includes("not found") ||
          data.message.toLowerCase().includes("restricted"))
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

      // LinkedIn detection
      if ("author" in data && "likeCount" in data && "commentCount" in data) {
        return {
          ...data,
          platform: "linkedin",
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
      video_play_count: z
        .number()
        .nullish()
        .transform((val) => val ?? 0),
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

    z.object({
      platform: z.literal("linkedin"),
      name: z.string().nullish(),
      description: z.string().nullish(),
      headline: z.string().nullish(),
      datePublished: z.string().nullish(),
      likeCount: z
        .number()
        .nullish()
        .transform((val) => val ?? 0),
      author: z.object({
        url: z.string(),
        followers: z
          .number()
          .nullish()
          .transform((val) => val ?? 0),
      }),
    }),
  ]),
);

export const youtubeChannelVideosSchema = z.object({
  videos: z.array(
    z.object({
      type: z.string(),
      id: z.string(),
      url: z.string(),
      title: z.string().nullish(),
      description: z.string().nullish(),
      thumbnail: z.string().nullish(),
      channel: z
        .object({
          title: z.string().nullish(),
          thumbnail: z.string().nullish(),
        })
        .optional(),
      viewCountText: z.string().nullish(),
      viewCountInt: z
        .number()
        .nullish()
        .transform((val) => val ?? 0),
      likeCountInt: z.number().nullish(),
      commentCountInt: z.number().nullish(),
      publishedTimeText: z.string().nullish(),
      publishedTime: z.string().nullish(),
      lengthText: z.string().nullish(),
      lengthSeconds: z
        .number()
        .nullish()
        .transform((val) => val ?? 0),
      badges: z.array(z.unknown()).optional(),
    }),
  ),
  continuationToken: z.string().nullish(),
});

export const youtubeTranscriptSchema = z.object({
  videoId: z.string(),
  type: z.string(),
  url: z.string(),
  transcript: z
    .array(
      z.object({
        text: z.string(),
        startMs: z.string(),
        endMs: z.string(),
        startTimeText: z.string().nullish(),
      }),
    )
    .nullable(),
  transcript_only_text: z.string().nullish(),
  language: z.string().nullish(),
});

const urlListSchema = z
  .object({
    url_list: z.array(z.string()).nullish(),
  })
  .nullish();

const stringFromStringOrNumberSchema = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => (value == null ? value : String(value)));

const booleanFromBooleanOrNumberSchema = z
  .union([z.boolean(), z.number()])
  .nullish()
  .transform((value) => {
    if (typeof value === "number") {
      return value !== 0;
    }

    return value;
  });

export const tiktokProfileVideosSchema = z.object({
  aweme_list: z.array(
    z.object({
      aweme_id: z.string().nullish(),
      id_str: z.string().nullish(),
      desc: z.string().nullish(),
      create_time: z.number().nullish(),
      create_time_utc: z.string().nullish(),
      duration: z.number().nullish(),
      url: z.string().nullish(),
      statistics: z
        .object({
          play_count: z.number().nullish(),
          digg_count: z.number().nullish(),
          comment_count: z.number().nullish(),
          share_count: z.number().nullish(),
          collect_count: z.number().nullish(),
        })
        .nullish(),
      video: z
        .object({
          duration: z.number().nullish(),
          dynamic_cover: urlListSchema,
          cover: urlListSchema,
        })
        .nullish(),
    }),
  ),
  max_cursor: stringFromStringOrNumberSchema,
  has_more: booleanFromBooleanOrNumberSchema,
});

export const tiktokTranscriptSchema = z.object({
  id: z.string().nullish(),
  url: z.string(),
  transcript: z.string().nullish(),
});

const instagramCaptionSchema = z
  .object({
    text: z.string().nullish(),
  })
  .nullish();

const instagramImageVersionsSchema = z
  .object({
    candidates: z
      .array(
        z.object({
          url: z.string(),
        }),
      )
      .nullish(),
  })
  .nullish();

export const instagramUserPostsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().nullish(),
      pk: z.string().nullish(),
      code: z.string().nullish(),
      url: z.string().nullish(),
      media_type: z.number().nullish(),
      product_type: z.string().nullish(),
      taken_at: z.number().nullish(),
      caption: instagramCaptionSchema,
      play_count: z.number().nullish(),
      ig_play_count: z.number().nullish(),
      like_count: z.number().nullish(),
      comment_count: z.number().nullish(),
      display_uri: z.string().nullish(),
      image_versions2: instagramImageVersionsSchema,
      video_versions: z
        .array(
          z.object({
            url: z.string().nullish(),
          }),
        )
        .nullish(),
      video_duration: z.number().nullish(),
      has_audio: z.boolean().nullish(),
    }),
  ),
  next_max_id: z.string().nullish(),
  more_available: z.boolean().nullish(),
});

export const instagramMediaTranscriptSchema = z.object({
  success: z.boolean().nullish(),
  transcripts: z
    .array(
      z.object({
        id: z.string().nullish(),
        shortcode: z.string().nullish(),
        text: z.string().nullish(),
      }),
    )
    .nullish(),
});
