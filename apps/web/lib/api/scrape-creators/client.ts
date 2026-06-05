import { createFetch, createSchema } from "@better-fetch/fetch";
import { PlatformType } from "@dub/prisma/client";
import * as z from "zod/v4";
import {
  socialContentSchema,
  socialProfileSchema,
  youtubeChannelVideosSchema,
} from "./schema";

export const scrapeCreatorsFetch = createFetch({
  baseURL: "https://api.scrapecreators.com",
  retry: {
    type: "linear",
    attempts: 1,
    delay: 3000,
  },
  headers: {
    "x-api-key": process.env.SCRAPECREATORS_API_KEY!,
  },
  schema: createSchema(
    {
      // Fetch social profile
      "/v1/:platform/:handleType": {
        method: "get",
        params: z.object({
          platform: z.enum(PlatformType),
          handleType: z.enum(["channel", "profile"]),
        }),
        query: z.object({
          handle: z.string(),
        }),
        output: socialProfileSchema,
      },

      // Fetch social content
      "/:version/:platform/:contentType": {
        method: "get",
        params: z.object({
          version: z.enum(["v1", "v2"]),
          platform: z.enum(PlatformType),
          contentType: z.enum(["post", "video", "tweet"]),
        }),
        query: z.object({
          url: z.string(),
        }),
        output: socialContentSchema,
      },

      // Fetch recent YouTube channel videos
      "/v1/youtube/channel-videos": {
        method: "get",
        query: z
          .object({
            channelId: z.string().optional(),
            handle: z.string().optional(),
            sort: z.enum(["latest", "popular"]).optional(),
            continuationToken: z.string().optional(),
            includeExtras: z.enum(["true", "false"]).optional(),
          })
          .refine((query) => query.channelId || query.handle, {
            message: "Either channelId or handle is required.",
          }),
        output: youtubeChannelVideosSchema,
      },
    },
    {
      strict: true,
    },
  ),
  onError: ({ error }) => {
    console.error("[ScrapeCreators] Error", error);
  },
  // onResponse: async ({ response }) => {
  //   console.log(
  //     "[ScrapeCreators] Response",
  //     prettyPrint(await response.clone().json()),
  //   );
  // },
});
