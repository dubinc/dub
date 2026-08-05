import { genericOAuth } from "better-auth/plugins";

const baseURL = process.env.BETTER_AUTH_URL;

export const samlSso = genericOAuth({
  config: [
    {
      providerId: "saml",
      clientId: "dummy",
      clientSecret: process.env.NEXTAUTH_SECRET!,
      authorizationUrl: `${baseURL}/api/auth/saml/authorize`,
      tokenUrl: `${baseURL}/api/auth/saml/token`,
      userInfoUrl: `${baseURL}/api/auth/saml/userinfo`,
      scopes: [],
      pkce: true,
      responseType: "code",
      authorizationUrlParams: (ctx) => {
        const additionalData = ctx.body?.additionalData as
          | Record<string, unknown>
          | undefined;

        return {
          provider: "saml",
          ...(typeof additionalData?.tenant === "string" && {
            tenant: additionalData.tenant,
            product:
              typeof additionalData.product === "string"
                ? additionalData.product
                : "Dub",
          }),
        };
      },
      mapProfileToUser: (profile) => ({
        name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
        email: profile.email,
        emailVerified: true,
      }),
    },
  ],
});
