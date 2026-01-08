import { PartnerPlatform, SocialPlatform } from "@dub/prisma/client";
import { scrapeCreatorsFetch } from "./client";

type FetchSocialProfileParams = {
  platform: SocialPlatform;
  handle: string;
};

type SocialProfile = Pick<
  PartnerPlatform,
  "platformId" | "followers" | "posts" | "views"
> & {
  description: string | null;
};

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

  let socialProfile: SocialProfile = {
    description: null,
    platformId: null,
    followers: BigInt(0),
    posts: BigInt(0),
    views: BigInt(0),
  };

  switch (data.platform) {
    case "youtube": {
      socialProfile.description = data.description;
      socialProfile.platformId = data.channelId;
      socialProfile.followers = BigInt(data.subscriberCount);
      socialProfile.posts = BigInt(data.videoCount);
      socialProfile.views = BigInt(data.viewCount);
      break;
    }

    case "instagram": {
      socialProfile.description = data.data.user.biography;
      socialProfile.followers = BigInt(data.data.user.edge_followed_by.count);
      socialProfile.posts = BigInt(
        data.data.user.edge_owner_to_timeline_media.count,
      );
      break;
    }
  }

  return socialProfile;
}
