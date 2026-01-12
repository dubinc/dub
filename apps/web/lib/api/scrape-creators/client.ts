import { createFetch, createSchema } from "@better-fetch/fetch";
import { PlatformType } from "@dub/prisma/client";
import * as z from "zod/v4";
import { profileResponseSchema } from "./schema";

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
      "/v1/:platform/:handleType": {
        method: "get",
        params: z.object({
          platform: z.enum(PlatformType),
          handleType: z.enum(["channel", "profile"]),
        }),
        query: z.object({
          handle: z.string(),
        }),
        output: profileResponseSchema,
      },
    },
    { strict: true },
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
