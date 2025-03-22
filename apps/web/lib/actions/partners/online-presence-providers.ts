import { Partner } from "@prisma/client";

type OnlinePresenceProvider = {
  verifiedColumn: string;
  authUrl: string;
  tokenUrl: string;
  clientId: string | null;
  clientSecret: string | null;
  clientIdParam?: string;
  pkce?: boolean;
  scopes: string;
  verify: (props: {
    partner: Partner;
    accessToken: string;
  }) => Promise<boolean>;
};

export const ONLINE_PRESENCE_PROVIDERS: Record<string, OnlinePresenceProvider> =
  {
    youtube: {
      verifiedColumn: "youtubeVerifiedAt",
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId: process.env.YOUTUBE_CLIENT_ID ?? null,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? null,
      scopes: "https://www.googleapis.com/auth/youtube.readonly",
      verify: async ({ partner, accessToken }) => {
        if (!partner.youtube) return false;

        // Fetch channel info
        const channelResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&access_token=${accessToken}`,
        ).then((r) => r.json());

        const handle = channelResponse?.items?.[0]?.snippet?.customUrl;

        return (
          !!handle &&
          `@${partner.youtube?.toLowerCase()}` === handle.toLowerCase()
        );
      },
    },
    twitter: {
      verifiedColumn: "twitterVerifiedAt",
      authUrl: "https://x.com/i/oauth2/authorize",
      tokenUrl: "https://api.x.com/2/oauth2/token",
      clientId: process.env.TWITTER_CLIENT_ID ?? null,
      clientSecret: process.env.TWITTER_CLIENT_SECRET ?? null,
      pkce: true,
      scopes: "users.read tweet.read",
      verify: async ({ partner, accessToken }) => {
        if (!partner.twitter) return false;

        // Fetch user info
        const userResponse = await fetch("https://api.twitter.com/2/users/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }).then((r) => r.json());

        const username = userResponse?.data?.username;

        return (
          !!username && partner.twitter.toLowerCase() === username.toLowerCase()
        );
      },
    },
    tiktok: {
      verifiedColumn: "tiktokVerifiedAt",
      authUrl: "https://www.tiktok.com/v2/auth/authorize",
      tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
      clientId: process.env.TIKTOK_CLIENT_ID ?? null,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET ?? null,
      clientIdParam: "client_key",
      scopes: "user.info.basic,user.info.profile",
      verify: async ({ partner, accessToken }) => {
        if (!partner.tiktok) return false;

        // Fetch user info
        const userResponse = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=username",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        ).then((r) => r.json());

        const username = userResponse?.data?.user?.username;

        console.log({ userResponse, user: userResponse?.data?.user, username });

        return (
          !!username && partner.tiktok.toLowerCase() === username.toLowerCase()
        );
      },
    },
  };
