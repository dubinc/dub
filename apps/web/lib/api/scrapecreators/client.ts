import { SocialPlatform } from "@/lib/social-utils";
import { z } from "zod";

const SCRAPECREATORS_API_BASE_URL = "https://api.scrapecreators.com";
const SCRAPECREATORS_API_KEY = process.env.SCRAPECREATORS_API_KEY || "";

const profileResponseSchema = z
  .object({
    bio: z.string().optional(),
    description: z.string().optional(),
    about: z.string().optional(),
    summary: z.string().optional(),
  })
  .passthrough();

const errorResponseSchema = z.object({
  message: z.string(),
});

type ProfileResponse = z.infer<typeof profileResponseSchema>;

type PlatformRequestConfig = {
  path: string;
  buildSearchParams: (handle: string) => URLSearchParams;
};

const PLATFORM_REQUEST_CONFIG: Record<SocialPlatform, PlatformRequestConfig> = {
  youtube: {
    path: "/v1/youtube/channel",
    buildSearchParams: (handle) => new URLSearchParams({ handle }),
  },
  linkedin: {
    path: "/v1/linkedin/profile",
    buildSearchParams: (handle) =>
      new URLSearchParams({
        url: `https://www.linkedin.com/in/${handle}`,
      }),
  },
  instagram: {
    path: "/v1/instagram/profile",
    buildSearchParams: (handle) => new URLSearchParams({ handle }),
  },
  tiktok: {
    path: "/v1/tiktok/profile",
    buildSearchParams: (handle) => new URLSearchParams({ handle }),
  },
  twitter: {
    path: "/v1/twitter/profile",
    buildSearchParams: (handle) => new URLSearchParams({ handle }),
  },
};

export class ScrapeCreatorsClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = SCRAPECREATORS_API_KEY;
    this.baseUrl = SCRAPECREATORS_API_BASE_URL;
  }

  // Fetches account profile data from the ScrapeCreators API for a given social platform.
  public async fetchAccount({
    platform,
    handle,
  }: {
    platform: SocialPlatform;
    handle: string;
  }): Promise<ProfileResponse> {
    if (!this.apiKey) {
      throw new Error("SCRAPECREATORS_API_KEY is not configured.");
    }

    const config = PLATFORM_REQUEST_CONFIG[platform];

    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const endpoint = `${this.baseUrl}${config.path}`;
    const searchParams = config.buildSearchParams(handle);

    const response = await fetch(`${endpoint}?${searchParams.toString()}`, {
      headers: {
        "x-api-key": this.apiKey,
      },
    });

    const jsonResponse = await response.json();

    if (!response.ok) {
      console.error("[ScrapeCreators] Failed to fetch account", {
        ...jsonResponse,
        platform,
        handle,
      });

      const { message } = errorResponseSchema.parse(jsonResponse);
      throw new Error(message);
    }

    console.log(jsonResponse);

    return profileResponseSchema.parse(jsonResponse);
  }

  // Verifies that a verification code exists in the account's profile bio/description.
  // Fetches the account profile and checks if the provided code appears in any of the
  // profile text fields (description, about, bio, summary).
  async verifyAccount({
    platform,
    handle,
    code,
  }: {
    platform: SocialPlatform;
    handle: string;
    code: string;
  }): Promise<boolean> {
    const profile = await this.fetchAccount({
      platform,
      handle,
    });

    const textToCheck = [
      profile.description, // YouTube
      profile.about, // LinkedIn
      profile.bio,
      profile.summary,
    ]
      .filter(Boolean)
      .join(" ");

    return textToCheck.includes(code);
  }
}

export const scrapeCreatorsClient = new ScrapeCreatorsClient();
