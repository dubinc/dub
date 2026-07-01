import "server-only";

import { logger } from "@/lib/axiom/server";
import { createFetch, createSchema } from "@better-fetch/fetch";
import { prettyPrint } from "@dub/utils";
import { PlatformType } from "@prisma/client";
import * as z from "zod/v4";
import {
  instagramMediaTranscriptSchema,
  instagramUserPostsSchema,
  socialContentSchema,
  socialProfileSchema,
  tiktokProfileVideosSchema,
  tiktokTranscriptSchema,
  youtubeChannelVideosSchema,
  youtubeTranscriptSchema,
} from "./schema";

// Bound each request so a hung vendor call can't run past the caller's
// (cron/route) maxDuration. Aborts the fetch; the single linear retry still applies.
const SCRAPE_CREATORS_REQUEST_TIMEOUT_MS = 30_000;
export const scrapeCreatorsFetch = createFetch({
  baseURL: "https://api.scrapecreators.com",
  timeout: SCRAPE_CREATORS_REQUEST_TIMEOUT_MS,
  retry: {
    type: "linear",
    attempts: 1,
    delay: 3000,
  },
  headers: {
    "x-api-key": process.env.SCRAPECREATORS_API_KEY ?? "",
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

      // Fetch a YouTube video or short transcript
      "/v1/youtube/video/transcript": {
        method: "get",
        query: z.object({
          url: z.string(),
          language: z.string().length(2).optional(),
        }),
        output: youtubeTranscriptSchema,
      },

      // Fetch recent TikTok profile videos
      "/v3/tiktok/profile/videos": {
        method: "get",
        query: z.object({
          handle: z.string(),
          user_id: z.string().optional(),
          sort_by: z.enum(["latest", "popular"]).optional(),
          max_cursor: z.string().optional(),
          region: z.string().optional(),
          trim: z.boolean().optional(),
        }),
        output: tiktokProfileVideosSchema,
      },

      // Fetch a TikTok video transcript
      "/v1/tiktok/video/transcript": {
        method: "get",
        query: z.object({
          url: z.string(),
          language: z.string().length(2).optional(),
          use_ai_as_fallback: z.enum(["true", "false"]).optional(),
        }),
        output: tiktokTranscriptSchema,
      },

      // Fetch recent Instagram user posts
      "/v2/instagram/user/posts": {
        method: "get",
        query: z.object({
          handle: z.string(),
          next_max_id: z.string().optional(),
          trim: z.boolean().optional(),
        }),
        // Parsed in getInstagramUserPosts so account-unavailable responses can
        // be classified as empty results instead of strict-schema 500s.
        output: z.unknown(),
      },

      // Fetch an Instagram video/reel transcript
      "/v2/instagram/media/transcript": {
        method: "get",
        query: z.object({
          url: z.string(),
        }),
        output: instagramMediaTranscriptSchema,
      },
    },
    {
      strict: true,
    },
  ),
  onError: ({ error }) => {
    logger.error("[ScrapeCreators] Error", {
      error: prettyPrint(error),
    });
    void logger.flush();
  },
});
