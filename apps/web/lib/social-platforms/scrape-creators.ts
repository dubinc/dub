import { createFetch, createSchema } from "@better-fetch/fetch";
import * as z from "zod/v4";

export class ScrapeCreatorsContentError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ScrapeCreatorsContentError";
    this.status = status;
  }
}

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
  schema: createSchema({
    "/:version/:platform/:contentType": {
      method: "get",
      params: z.object({
        version: z.enum(["v1", "v2"]),
        platform: z.string(),
        contentType: z.enum(["post", "video", "tweet"]),
      }),
      query: z.object({
        url: z.string(),
      }),
      output: z.unknown(),
    },
  }),
  onError: ({ error }) => {
    console.error("[ScrapeCreators] Error", error);
  },
});
