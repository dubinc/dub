import { createFetch, createSchema } from "@better-fetch/fetch";
import * as z from "zod/v4";
import {
  type YouTubeApiErrorResponse,
  youtubeApiErrorSchema,
  youtubePlaylistItemsResponseSchema,
  youtubeVideosResponseSchema,
} from "./youtube-schemas";

export const ytFetch = createFetch({
  baseURL: "https://www.googleapis.com/youtube/v3",
  headers: {
    "X-Goog-Api-Key": process.env.YOUTUBE_API_KEY!,
  },
  schema: createSchema(
    {
      "/playlistItems": {
        method: "get",
        query: z.object({
          part: z.string(),
          playlistId: z.string(),
          maxResults: z.string(),
          pageToken: z.string().optional(),
        }),
        output: youtubePlaylistItemsResponseSchema,
      },
      "/videos": {
        method: "get",
        query: z.object({
          part: z.string(),
          id: z.string(),
        }),
        output: youtubeVideosResponseSchema,
      },
    },
    {
      strict: true,
    },
  ),
  defaultError: youtubeApiErrorSchema,
  onError: ({ error }) => {
    console.error("[YouTube API] Error", error);
  },
});

export class YouTubeApiError extends Error {
  status: number;
  statusText: string;
  detail?: string;

  constructor(
    error: YouTubeApiErrorResponse & { status: number; statusText: string },
  ) {
    const message =
      error.error?.message ||
      error.error?.errors?.map((e) => e.message).join("; ") ||
      error.statusText;

    super(message);
    this.name = "YouTubeApiError";
    this.status = error.status;
    this.statusText = error.statusText;
    this.detail = error.error?.message;
  }
}

export class YouTubeApiQuotaExceededError extends Error {
  constructor() {
    super("YouTube API daily quota exceeded");
    this.name = "YouTubeApiQuotaExceededError";
  }
}
