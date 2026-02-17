import { createFetch, createSchema } from "@better-fetch/fetch";
import { PlatformType } from "@dub/prisma/client";
import * as z from "zod/v4";
import { socialContentStatsSchema, socialProfileSchema } from "./schema";

export const scrapeCreatorsFetch = createFetch({
  baseURL: "https://api.scrapecreators.com",
  retry: {
    type: "linear",
    attempts: 2,
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
        output: socialContentStatsSchema,
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
  //   if (process.env.NODE_ENV === "development") {
  //     console.log(
  //       "[ScrapeCreators] Response",
  //       prettyPrint(await response.clone().json()),
  //     );
  //   }
  // },
});
