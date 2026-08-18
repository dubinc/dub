import { SSO_LOGIN_PROGRAMS } from "@/lib/auth/sso-login-programs";
import type { GenericOAuthConfig } from "better-auth/plugins";

export const programOAuthProviderIds = SSO_LOGIN_PROGRAMS.map(
  ({ slug }) => slug,
);

export const programOAuthConfigs: GenericOAuthConfig[] = SSO_LOGIN_PROGRAMS.map(
  ({ slug, oauth, mapProfile }) => ({
    providerId: slug,
    clientId: oauth.clientId,
    clientSecret: oauth.clientSecret,
    authorizationUrl: oauth.authorizationUrl,
    tokenUrl: oauth.tokenUrl,
    userInfoUrl: oauth.userInfoUrl,
    scopes: [oauth.scope],
    responseType: "code",
    // Keep NextAuth-era redirect URIs so Framer/Beehiiv allowlists keep working.
    // Inbound callbacks are proxied to /oauth2/callback/:provider.
    redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/${slug}`,
    // Never treat program IdP email as verified — program providers are not in
    // trustedProviders, so forcing false blocks silent account takeover on link.
    getUserInfo: async (tokens) => {
      try {
        if (!tokens.accessToken) {
          console.error(
            `[Partner SSO] Failed to fetch userinfo for ${slug}.`,
            "Missing access token",
          );
          return null;
        }

        const response = await fetch(oauth.userInfoUrl, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
          signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
          console.error(
            `[Partner SSO] Failed to fetch userinfo for ${slug}.`,
            response.status,
            response.statusText,
          );
          return null;
        }

        const profile = await response.json();
        const mapped = mapProfile
          ? mapProfile(profile)
          : {
              id: String(profile.id ?? profile.sub ?? ""),
              email: profile.email,
              name:
                profile.name ||
                [profile.given_name, profile.family_name]
                  .filter(Boolean)
                  .join(" ") ||
                profile.email,
              image: profile.picture ?? profile.image ?? null,
            };

        if (!mapped.id || !mapped.email) {
          console.error(
            `[Partner SSO] Incomplete userinfo for ${slug}.`,
            mapped,
          );
          return null;
        }

        return {
          id: mapped.id,
          email: mapped.email,
          name: mapped.name,
          image: mapped.image ?? undefined,
          emailVerified: false,
        };
      } catch (error) {
        console.error(
          `[Partner SSO] Failed to fetch userinfo for ${slug}.`,
          error,
        );
        return null;
      }
    },
  }),
);
