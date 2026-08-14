import { prisma } from "@/lib/prisma";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { handleOAuthUserInfo } from "better-auth/oauth2";
import type { GenericOAuthConfig } from "better-auth/plugins";
import { z } from "zod";

const baseURL = process.env.BETTER_AUTH_URL;

const jacksonProfileSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  email: z.string().trim().min(1),
  firstName: z.string().optional().nullish(),
  lastName: z.string().optional().nullish(),
  requested: z.object({
    tenant: z.string().min(1),
  }),
});

const samlIdpBodySchema = z.object({
  code: z.string().min(1),
});

export const samlOAuthConfig: GenericOAuthConfig = {
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
    const { tenant } = (ctx.body?.additionalData ?? {}) as {
      tenant?: string;
    };

    if (!tenant) {
      throw new Error("[SAML SSO] tenant is required in additionalData.");
    }

    return {
      provider: "saml",
      tenant,
      product: "Dub",
    };
  },
  getUserInfo: async (tokens) => {
    const response = await fetch(`${baseURL}/api/auth/saml/userinfo`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      console.error(
        "[SAML SSO] Failed to fetch userinfo from Jackson.",
        response.statusText,
      );
      return null;
    }

    const profile = await response.json();

    return resolveUser(profile);
  },
};

export const samlIdp = {
  id: "saml-idp",
  endpoints: {
    signInSamlIdp: createAuthEndpoint(
      "/sign-in/saml-idp",
      {
        method: "POST",
        body: samlIdpBodySchema,
      },
      async (ctx) => {
        const { code } = ctx.body;

        const { jackson } = await import("@/lib/jackson");
        const { oauthController } = await jackson();

        if (!baseURL) {
          throw new APIError("INTERNAL_SERVER_ERROR", {
            message: "SAML redirect URI is not configured.",
          });
        }

        const { access_token: accessToken } = await oauthController.token({
          code,
          grant_type: "authorization_code",
          redirect_uri: baseURL,
          client_id: "dummy",
          client_secret: process.env.NEXTAUTH_SECRET!,
        });

        if (!accessToken) {
          throw new APIError("UNAUTHORIZED", {
            message: "Failed to exchange SAML authorization code.",
          });
        }

        const profile = await oauthController.userInfo(accessToken);
        const userInfo = await resolveUser(profile);

        if (!userInfo) {
          throw new APIError("UNAUTHORIZED", {
            message: "Failed to verify SAML identity.",
          });
        }

        const result = await handleOAuthUserInfo(ctx, {
          userInfo: {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            emailVerified: userInfo.emailVerified,
            image: undefined,
          },
          account: {
            providerId: "saml",
            accountId: userInfo.id,
            accessToken,
          },
          callbackURL: "/",
        });

        if (result.error || !result.data) {
          throw new APIError("UNAUTHORIZED", {
            message: result.error || "Failed to create SAML session.",
          });
        }

        await setSessionCookie(ctx, result.data);

        return ctx.json({
          redirect: true,
          url: "/",
        });
      },
    ),
  },
} satisfies BetterAuthPlugin;

async function resolveUser(profile: unknown) {
  const parsed = jacksonProfileSchema.safeParse(profile);
  if (!parsed.success) {
    console.error(
      "[SAML SSO] Invalid userinfo from Jackson.",
      z.treeifyError(parsed.error),
    );
    return null;
  }

  const {
    id,
    email,
    firstName,
    lastName,
    requested: { tenant: workspaceId },
  } = parsed.data;

  const emailDomain = email.split("@")[1]?.toLocaleLowerCase();
  if (!emailDomain) {
    console.error("[SAML SSO] Invalid email in userinfo from Jackson.");
    return null;
  }

  // Enforce email domain
  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      ssoEmailDomain: true,
    },
  });

  if (!workspace?.ssoEmailDomain) {
    console.error(
      `[SAML SSO] Workspace not found or ssoEmailDomain not set for the workspace ${workspaceId}`,
    );
    return null;
  }

  if (emailDomain !== workspace.ssoEmailDomain.toLocaleLowerCase()) {
    console.error(
      `[SAML SSO] Email domain ${emailDomain} does not match the ssoEmailDomain ${workspace.ssoEmailDomain} for the workspace ${workspaceId}`,
    );
    return null;
  }

  return {
    id,
    email,
    name: `${firstName || ""} ${lastName || ""}`.trim(),
    emailVerified: true,
  };
}
