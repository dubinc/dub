import {
  getLinkedInProfile,
  LinkedInProfileUnavailableError,
} from "@/lib/api/scrape-creators/get-linkedin-profile";
import { linkedInProfilesMatch } from "@/lib/partners/linkedin-profile-match";
import { TikTokClient } from "@/lib/tiktok/client";

type PartnerPlatformsProvider = {
  authUrl: string;
  tokenUrl: string;
  clientId: string | null;
  clientSecret: string | null;
  clientIdParam?: string;
  pkce?: boolean;
  basicAuth?: boolean;
  scopes: string;
  verify: (props: {
    handle: string;
    accessToken: string;
    idToken?: string;
  }) => Promise<{
    verified: boolean;
    failureReason?: "private" | "mismatch" | "oauth";
    platformId?: string;
    avatarUrl?: string | null;
    subscribers?: bigint;
    metadata?: Record<string, string>;
  }>;
};

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      name?: string;
      picture?: string;
    };
  } catch {
    return null;
  }
}

export function getPartnerPlatformOAuthProvider(platform: string) {
  const provider = PARTNER_PLATFORMS_PROVIDERS[platform];

  if (!provider?.clientId) {
    return undefined;
  }

  return provider;
}

export const PARTNER_PLATFORMS_PROVIDERS: Record<
  string,
  PartnerPlatformsProvider
> = {
  twitter: {
    authUrl: "https://x.com/i/oauth2/authorize",
    tokenUrl: "https://api.x.com/2/oauth2/token",
    clientId: process.env.TWITTER_CLIENT_ID ?? null,
    clientSecret: process.env.TWITTER_CLIENT_SECRET ?? null,
    pkce: true,
    scopes: "users.read tweet.read",
    verify: async ({ handle, accessToken }) => {
      if (!handle) {
        return {
          verified: false,
        };
      }

      // Fetch user info
      const response = await fetch("https://api.twitter.com/2/users/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const userResponse = await response.json();

      if (!response.ok) {
        console.error("Failed to verify Twitter handle", userResponse);

        return {
          verified: false,
        };
      }

      const username = userResponse?.data?.username;

      if (!username) {
        console.error(
          "No username found in Twitter user response",
          userResponse,
        );

        return {
          verified: false,
        };
      }

      return {
        verified: handle.toLowerCase() === username.toLowerCase(),
      };
    },
  },

  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    clientId: process.env.TIKTOK_CLIENT_ID ?? null,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET ?? null,
    clientIdParam: "client_key",
    scopes: "user.info.basic,user.info.profile",
    verify: async ({ handle, accessToken }) => {
      if (!handle) {
        return {
          verified: false,
        };
      }

      const tiktokClient = new TikTokClient({ accessToken });

      try {
        const user = await tiktokClient.getUserInfo();
        const username = user.data.user.username;

        return {
          verified: handle.toLowerCase() === username.toLowerCase(),
        };
      } catch (error) {
        console.error("Failed to verify TikTok handle", error);

        return {
          verified: false,
        };
      }
    },
  },

  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    clientId: process.env.LINKEDIN_CLIENT_ID ?? null,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? null,
    basicAuth: false,
    scopes: "openid profile",
    verify: async ({ handle, accessToken, idToken }) => {
      if (!handle) {
        return {
          verified: false,
          failureReason: "oauth",
        };
      }

      // LinkedIn OIDC access tokens are often unusable with /v2/userinfo
      // (REVOKED_ACCESS_TOKEN). Prefer claims from the ID token.
      let userInfo: {
        sub?: string;
        name?: string;
        picture?: string;
      } | null = idToken ? decodeJwtPayload(idToken) : null;

      if (!userInfo) {
        const response = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        userInfo = await response.json();

        if (!response.ok) {
          console.error("Failed to verify LinkedIn handle", userInfo);

          return {
            verified: false,
            failureReason: "oauth",
          };
        }
      }

      let scrapedProfile;

      try {
        const profileUrl = `https://www.linkedin.com/in/${handle}/`;
        console.info("Scraping LinkedIn profile", { handle, profileUrl });
        scrapedProfile = await getLinkedInProfile(profileUrl);
      } catch (error) {
        console.error("Failed to scrape LinkedIn profile", error);

        return {
          verified: false,
          failureReason:
            error instanceof LinkedInProfileUnavailableError
              ? "private"
              : "oauth",
        };
      }

      const verified = linkedInProfilesMatch({
        oauthName: userInfo?.name,
        oauthPicture: userInfo?.picture,
        scrapedName: scrapedProfile.name,
        scrapedImage: scrapedProfile.image,
      });

      if (!verified) {
        console.warn("LinkedIn OIDC profile did not match scraped profile", {
          handle,
          oauthName: userInfo?.name,
          scrapedName: scrapedProfile.name,
        });

        return {
          verified: false,
          failureReason: "mismatch",
        };
      }

      return {
        verified: true,
        platformId: userInfo?.sub ? String(userInfo.sub) : undefined,
        avatarUrl: scrapedProfile.image,
        subscribers:
          scrapedProfile.followers > 0
            ? BigInt(scrapedProfile.followers)
            : undefined,
      };
    },
  },
};
