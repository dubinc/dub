import * as z from "zod/v4";

export const youtubeContentSchema = z.object({
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

export const youtubeProfileSchema = z.object({
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

// YouTube Data API v3 response schemas
const youtubePlaylistItemSchema = z.object({
  contentDetails: z.object({
    videoId: z.string(),
    videoPublishedAt: z.string(),
  }),
});

export const youtubePlaylistItemsResponseSchema = z.object({
  items: z.array(youtubePlaylistItemSchema).default([]),
  nextPageToken: z.string().optional(),
});

export const youtubeVideoSchema = z.object({
  id: z.string(),
  snippet: z.object({
    publishedAt: z.string(),
    title: z.string(),
  }),
  statistics: z.object({
    viewCount: z
      .string()
      .nullish()
      .transform((val) => (val ? parseInt(val, 10) : 0)),
    likeCount: z
      .string()
      .nullish()
      .transform((val) => (val ? parseInt(val, 10) : 0)),
    commentCount: z
      .string()
      .nullish()
      .transform((val) => (val ? parseInt(val, 10) : 0)),
  }),
});

export const youtubeVideosResponseSchema = z.object({
  items: z.array(youtubeVideoSchema).default([]),
});

export const youtubeApiErrorSchema = z.object({
  error: z
    .object({
      code: z.number().optional(),
      message: z.string().optional(),
      errors: z
        .array(
          z.object({
            message: z.string().optional(),
            domain: z.string().optional(),
            reason: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export type YouTubeVideo = z.infer<typeof youtubeVideoSchema>;
export type YouTubeApiErrorResponse = z.infer<typeof youtubeApiErrorSchema>;
