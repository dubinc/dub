import { createFetch, createSchema } from "@better-fetch/fetch";
import * as z from "zod/v4";

export class AccountNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountNotFoundError";
  }
}

export class ContentNotFoundError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ContentNotFoundError";
    this.status = status;
  }
}

export function isAccountNotFound(data: unknown): boolean {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  if (!("message" in data) || typeof (data as any).message !== "string") {
    return false;
  }

  const message = (data as any).message.toLowerCase();

  return (
    message.includes("doesn't exist") ||
    message.includes("does not exist") ||
    message.includes("not found")
  );
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
    "/v1/:platform/:handleType": {
      method: "get",
      params: z.object({
        platform: z.string(),
        handleType: z.enum(["channel", "profile"]),
      }),
      query: z.object({
        handle: z.string(),
      }),
      output: z.unknown(),
    },

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
