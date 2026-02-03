type PartnerPlatformsProvider = {
  authUrl: string;
  tokenUrl: string;
  clientId: string | null;
  clientSecret: string | null;
  clientIdParam?: string;
  pkce?: boolean;
  scopes: string;
  verify: (props: { handle: string; accessToken: string }) => Promise<{
    verified: boolean;
    metadata?: Record<string, string>;
  }>;
};

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

      // Fetch user info
      const response = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=username",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const userResponse = await response.json();

      if (!response.ok) {
        console.error("Failed to verify TikTok handle", userResponse);

        return {
          verified: false,
        };
      }

      const username = userResponse?.data?.user?.username;

      if (!username) {
        console.error(
          "No username found in TikTok user response",
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

  // We don't support LinkedIn verification yet
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    clientId: process.env.LINKEDIN_CLIENT_ID ?? null,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? null,
    scopes: "openid profile",
    verify: async ({ handle, accessToken }) => {
      if (!handle) {
        return {
          verified: false,
        };
      }

      // Fetch user info using OpenID Connect userinfo endpoint
      const response = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const userResponse = await response.json();

      if (!response.ok) {
        console.error("Failed to verify LinkedIn handle", userResponse);

        return {
          verified: false,
        };
      }

      // TODO:
      // We can't verify the handle because the LinkedIn API doesn't return the vanity name in the response

      return {
        verified: false,
      };
    },
  },
};
