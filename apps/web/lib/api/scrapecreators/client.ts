import { PlatformType } from "@dub/prisma/client";
import { z } from "zod";

const SCRAPECREATORS_API_BASE_URL = "https://api.scrapecreators.com";
const SCRAPECREATORS_API_KEY = process.env.SCRAPECREATORS_API_KEY || "";

export type ProfileFields = {
  description: string;
  platformId: string | null; // Eg. YouTube channel Id
};

// Platform-specific response schemas
const youtubeResponseSchema = z.object({
  description: z.string(),
  channelId: z.string(),
});

const instagramResponseSchema = z.object({
  data: z.object({
    user: z.object({
      biography: z.string(),
    }),
  }),
});

const errorResponseSchema = z.object({
  message: z.string(),
});

type PlatformRequestConfig = {
  path: string;
  buildSearchParams: (handle: string) => URLSearchParams;
  parseResponse: (data: unknown) => ProfileFields;
};

const PLATFORM_CONFIG: Record<
  Exclude<PlatformType, "linkedin" | "tiktok" | "twitter" | "website">,
  PlatformRequestConfig
> = {
  youtube: {
    path: "/v1/youtube/channel",
    buildSearchParams: (handle) => new URLSearchParams({ handle }),
    parseResponse: (data) => {
      const parsed = youtubeResponseSchema.parse(data);

      return {
        description: parsed.description,
        platformId: parsed.channelId,
      };
    },
  },
  instagram: {
    path: "/v1/instagram/profile",
    buildSearchParams: (handle) => new URLSearchParams({ handle }),
    parseResponse: (data) => {
      const parsed = instagramResponseSchema.parse(data);

      return {
        description: parsed.data.user.biography,
        platformId: null,
      };
    },
  },
};

export class ScrapeCreatorsClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    if (!SCRAPECREATORS_API_KEY) {
      throw new Error("SCRAPECREATORS_API_KEY is not configured.");
    }

    this.apiKey = SCRAPECREATORS_API_KEY;
    this.baseUrl = SCRAPECREATORS_API_BASE_URL;
  }

  // Fetches public profile text data for a supported social platform
  public async fetchSocialProfile({
    platform,
    handle,
  }: {
    platform: PlatformType;
    handle: string;
  }): Promise<ProfileFields> {
    const config = PLATFORM_CONFIG[platform];

    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const endpoint = `${this.baseUrl}${config.path}`;
    const searchParams = config.buildSearchParams(handle);

    const response = await fetch(`${endpoint}?${searchParams.toString()}`, {
      headers: {
        "x-api-key": this.apiKey,
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const jsonResponse = await response.json();

    if (!response.ok) {
      console.error("[ScrapeCreators] Failed to fetch account", {
        ...jsonResponse,
        platform,
        handle,
      });

      const parsedError = errorResponseSchema.safeParse(jsonResponse);

      throw new Error(
        parsedError.success
          ? parsedError.data.message
          : "Failed to fetch account profile.",
      );
    }

    return config.parseResponse(jsonResponse);
  }
}

export const scrapeCreatorsClient = new ScrapeCreatorsClient();
