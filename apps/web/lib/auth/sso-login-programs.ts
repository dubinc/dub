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
      scope: "email",
      tokenUrl: "https://api.framer.com/auth/oauth/token",
      userInfoUrl: "https://api.framer.com/auth/oauth/profile",
    },
  },
  {
    name: "Beehiiv",
    slug: "beehiiv",
    logo: "https://assets.dub.co/companies/beehiiv.svg",
    applyUrl: "https://www.beehiiv.com/partners",
    oauth: {
      clientId: process.env.BEEHIIV_CLIENT_ID as string,
      clientSecret: process.env.BEEHIIV_CLIENT_SECRET as string,
      authorizationUrl: "https://app.beehiiv.com/oauth/authorize",
      scope: "identify:read",
      tokenUrl: "https://app.beehiiv.com/oauth/token",
      userInfoUrl: "https://api.beehiiv.com/v2/users/identify",
    },
    // Beehiiv doesn't use the standard OpenID Connect userinfo payload
    // @see: https://developers.beehiiv.com/api-reference/oauth-users/identify
    mapProfile: (profile) => {
      const { email, first_name, last_name, profile_picture } = profile;
      if (!email) {
        // should never happen, but just in case
        throw new Error("Beehiiv profile is missing an email address");
      }
      return {
        id: email,
        name: [first_name, last_name].filter(Boolean).join(" ") || email,
        email,
        image: profile_picture ?? null,
      };
    },
  },
];
