import { PartnerPlatform, PlatformType } from "@prisma/client";
import * as z from "zod/v4";
import { ScrapeCreatorsApiError, scrapeCreatorsClient } from "./client";
import { socialProfileSchema } from "./schema";

type ScrapeCreatorsProfile = z.output<typeof socialProfileSchema>;

type ScrapeCreatorsPlatformProfile = Exclude<
  ScrapeCreatorsProfile,
  { platform: "account_not_found" }
>;

type SocialProfile = Pick<PartnerPlatform, "platformId" | "avatarUrl"> & {
  description: string | null;
  subscribers: bigint | undefined;
  posts: bigint | undefined;
  views: bigint | undefined;
};

interface GetSocialProfileParams {
  platform: PlatformType;
  handle: string;
}

export class AccountNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountNotFoundError";
  }
}

export class UnsupportedSocialPlatformError extends Error {
  constructor(platform: PlatformType) {
    super(`Fetching social profiles is not supported for ${platform}.`);
    this.name = "UnsupportedSocialPlatformError";
  }
}

function toOptionalCount(count: number) {
  return count === 0 ? undefined : BigInt(count);
}

async function fetchSocialProfile({
  platform,
  handle,
}: GetSocialProfileParams): Promise<ScrapeCreatorsProfile> {
  switch (platform) {
    case "youtube":
      return await scrapeCreatorsClient.getYouTubeChannel({ handle });
    case "instagram":
      return await scrapeCreatorsClient.getInstagramProfile({ handle });
    case "tiktok":
      return await scrapeCreatorsClient.getTikTokProfile({ handle });
    case "twitter":
      return await scrapeCreatorsClient.getTwitterProfile({ handle });
    case "linkedin":
    case "website":
      throw new UnsupportedSocialPlatformError(platform);
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}

export function mapSocialProfile(
  profile: ScrapeCreatorsPlatformProfile,
): SocialProfile {
  switch (profile.platform) {
    case "youtube": {
      const [largestAvatar] = [...profile.avatar.image.sources].sort(
        (a, b) => b.width - a.width,
      );

      return {
        platformId: profile.channelId,
        description: profile.description,
        avatarUrl: largestAvatar?.url ?? null,
        subscribers: toOptionalCount(profile.subscriberCount),
        posts: toOptionalCount(profile.videoCount),
        views: toOptionalCount(profile.viewCount),
      };
    }

    case "instagram": {
      const { user } = profile.data;

      return {
        platformId: null,
        description: user.biography,
        avatarUrl: user.profile_pic_url,
        subscribers: toOptionalCount(user.edge_followed_by.count),
        posts: toOptionalCount(user.edge_owner_to_timeline_media.count),
        views: undefined,
      };
    }

    case "tiktok":
      return {
        platformId: profile.user.id,
        description: profile.user.signature,
        avatarUrl: profile.user.avatarThumb,
        subscribers: toOptionalCount(profile.stats.followerCount),
        posts: toOptionalCount(profile.stats.videoCount),
        views: undefined,
      };

    case "twitter":
      return {
        platformId: profile.rest_id,
        description: profile.legacy.description,
        avatarUrl: profile.avatar.image_url,
        subscribers: toOptionalCount(profile.legacy.followers_count),
        posts: toOptionalCount(profile.legacy.statuses_count),
        views: undefined,
      };

    default: {
      const _exhaustive: never = profile;
      return _exhaustive;
    }
  }
}

export async function getSocialProfile({
  platform,
  handle,
}: GetSocialProfileParams): Promise<SocialProfile> {
  let profile: ScrapeCreatorsProfile;

  try {
    profile = await fetchSocialProfile({
      platform,
      handle,
    });
  } catch (error) {
    if (error instanceof ScrapeCreatorsApiError) {
      if (error.status === 404) {
        const notFound = socialProfileSchema.safeParse(error.data);

        if (
          notFound.success &&
          notFound.data.platform === "account_not_found"
        ) {
          throw new AccountNotFoundError(
            notFound.data.message || "Account doesn't exist.",
          );
        }
      }

      throw new Error(
        "We were unable to retrieve your social media profile. Please try again.",
        { cause: error },
      );
    }

    throw error;
  }

  // Check if account doesn't exist
  if (profile.platform === "account_not_found") {
    throw new AccountNotFoundError(profile.message || "Account doesn't exist.");
  }

  return mapSocialProfile(profile);
}
