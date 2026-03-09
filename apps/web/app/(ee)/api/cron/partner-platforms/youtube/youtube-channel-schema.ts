import * as z from "zod/v4";

export const youtubeChannelSchema = z.object({
  id: z.string(),
  statistics: z.object({
    videoCount: z.string().transform((val) => parseInt(val, 10)),
    subscriberCount: z.string().transform((val) => parseInt(val, 10)),
    viewCount: z.string().transform((val) => parseInt(val, 10)),
  }),
  snippet: z
    .object({
      customUrl: z.string().nullish(), // YouTube handle (e.g. "channelname" for @channelname)
      thumbnails: z
        .object({
          default: z
            .object({
              url: z.string(),
              width: z.number().optional(),
              height: z.number().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});
