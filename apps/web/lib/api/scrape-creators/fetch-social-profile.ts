import { PartnerPlatform, PlatformType } from "@dub/prisma/client";
import { scrapeCreatorsFetch } from "./client";

type FetchSocialProfileParams = {
  platform: PlatformType;
  handle: string;
};

type SocialProfile = Pick<
  PartnerPlatform,
  "platformId" | "subscribers" | "posts" | "views"
> & {
  description: string | null;
};

export class AccountNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountNotFoundError";
  }
}

export async function fetchSocialProfile({
  platform,
  handle,
}: FetchSocialProfileParams) {
  const { data, error } = await scrapeCreatorsFetch(
    "/v1/:platform/:handleType",
    {
      params: {
        platform,
        handleType: platform === "youtube" ? "channel" : "profile",
      },
      query: {
        handle,
      },
    },
  );

  if (error) {
    throw new Error(
      "We were unable to retrieve your social media profile. Please try again.",
    );
  }

  // Check if account doesn't exist
  if (data.platform === "account_not_found") {
    throw new AccountNotFoundError(
      (data as { message?: string }).message || "Account doesn't exist",
    );
  }

  let socialProfile: SocialProfile = {
    description: null,
    platformId: null,
    subscribers: BigInt(0),
    posts: BigInt(0),
    views: BigInt(0),
  };

  switch (data.platform) {
    case "youtube": {
      socialProfile.description = data.description;
      socialProfile.platformId = data.channelId;
      socialProfile.subscribers = BigInt(data.subscriberCount);
      socialProfile.posts = BigInt(data.videoCount);
      socialProfile.views = BigInt(data.viewCount);
      break;
    }

    case "instagram": {
      socialProfile.description = data.data.user.biography;
      socialProfile.subscribers = BigInt(data.data.user.edge_followed_by.count);
      socialProfile.posts = BigInt(
        data.data.user.edge_owner_to_timeline_media.count,
      );
      break;
    }

    case "tiktok": {
      socialProfile.description = data.user.signature;
      socialProfile.platformId = data.user.id;
      socialProfile.subscribers = BigInt(data.stats.followerCount);
      socialProfile.posts = BigInt(data.stats.videoCount);
      break;
    }

    case "twitter": {
      socialProfile.description = data.legacy.description;
      socialProfile.platformId = data.rest_id;
      socialProfile.subscribers = BigInt(data.legacy.followers_count);
      socialProfile.posts = BigInt(data.legacy.statuses_count);
      break;
    }
  }

  return socialProfile;
}
