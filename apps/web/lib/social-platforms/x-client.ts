import { createFetch, createSchema } from "@better-fetch/fetch";
import * as z from "zod/v4";
import {
  type XApiErrorResponse,
  xApiErrorSchema,
  xTweetsResponseSchema,
} from "./x-schemas";

export const xFetch = createFetch({
  baseURL: "https://api.x.com/2",
  headers: {
    Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}`,
  },
  schema: createSchema(
    {
      "/users/:userId/tweets": {
        method: "get",
        params: z.object({
          userId: z.string(),
        }),
        query: z.object({
          "tweet.fields": z.string(),
          exclude: z.string().optional(),
          start_time: z.string(),
          end_time: z.string(),
          max_results: z.string(),
          pagination_token: z.string().optional(),
        }),
        output: xTweetsResponseSchema,
      },
    },
    {
      strict: true,
    },
  ),
  defaultError: xApiErrorSchema,
  onError: ({ error }) => {
    console.error("[X API] Error", error);
  },
});

export class XApiError extends Error {
  status: number;
  statusText: string;
  title?: string;
  detail?: string;
  type?: string;
  errors?: XApiErrorResponse["errors"];

  constructor(
    error: XApiErrorResponse & { status: number; statusText: string },
  ) {
    const message =
      error.detail ||
      error.errors?.map((e) => e.message).join("; ") ||
      error.statusText;

    super(message);
    this.name = "XApiError";
    this.status = error.status;
    this.statusText = error.statusText;
    this.title = error.title;
    this.detail = error.detail;
    this.type = error.type;
    this.errors = error.errors;
  }
}

export class XApiRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XApiRateLimitError";
  }
}
