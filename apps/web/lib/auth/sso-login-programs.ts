export const SSO_LOGIN_PROGRAMS = [
  {
    name: "Framer",
    slug: "framer",
    logo: "https://assets.dub.co/companies/framer.svg",
    applyUrl: "https://www.framer.com/creators",
    oauth: {
      clientId: process.env.FRAMER_CLIENT_ID as string,
      clientSecret: process.env.FRAMER_CLIENT_SECRET as string,
      authorizationUrl: "https://api.framer.com/auth/oauth/authorize",
      tokenUrl: "https://api.framer.com/auth/oauth/token",
      userInfoUrl: "https://api.framer.com/auth/oauth/profile",
    },
  },
  {
    name: "Beehiiv",
    slug: "beehiiv",
    logo: "https://assets.dub.co/companies/beehiiv.svg",
    applyUrl: "https://partners.dub.co/programs/marketplace/beehiiv",
    oauth: {
      clientId: process.env.BEEHIIV_CLIENT_ID as string,
      clientSecret: process.env.BEEHIIV_CLIENT_SECRET as string,
      authorizationUrl: "https://app.beehiiv.com/oauth/authorize",
      tokenUrl: "https://app.beehiiv.com/oauth/token",
      userInfoUrl: "https://api.beehiiv.com/v2/users/identify",
    },
  },
] as const;
