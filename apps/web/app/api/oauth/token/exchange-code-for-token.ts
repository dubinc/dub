import { DubApiError } from "@/lib/api/errors";
import { OAUTH_CONFIG } from "@/lib/api/oauth/constants";
import { createToken, generateCodeChallengeHash } from "@/lib/api/oauth/utils";
import { hashToken } from "@/lib/auth";
import { installIntegration } from "@/lib/integrations/install";
import { generateRandomName } from "@/lib/names";
import z from "@/lib/zod";
import { authCodeExchangeSchema } from "@/lib/zod/schemas/oauth";
import { prisma } from "@dub/prisma";
import { getCurrentPlan } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextRequest } from "next/server";

// Exchange authorization code with access token
export const exchangeAuthCodeForToken = async (
  req: NextRequest,
  params: z.infer<typeof authCodeExchangeSchema>,
) => {
  const {
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  } = params;

  let { client_id: clientId, client_secret: clientSecret } = params;

  // If no client_id or client_secret is provided in the request body
  // then it should be provided in the Authorization header as Basic Auth for non-PKCE
  if (!clientId && !clientSecret) {
    const authorizationHeader = req.headers.get("Authorization") || "";
    const [type, token] = authorizationHeader.split(" ");

    if (type === "Basic") {
      const splits = Buffer.from(token, "base64").toString("utf-8").split(":");

      if (splits.length > 1) {
        clientId = splits[0];
        clientSecret = splits[1];
      }
    }
  }

  if (!clientId) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Missing client_id",
    });
  }

  const [app, accessCode] = await Promise.all([
    prisma.oAuthApp.findUnique({
      where: {
        clientId,
      },
      select: {
        integrationId: true,
        pkce: true,
        hashedClientSecret: true,
      },
    }),
    prisma.oAuthCode.findUnique({
      where: {
        code,
      },
      select: {
        clientId: true,
        userId: true,
        projectId: true,
        scopes: true,
        redirectUri: true,
        expiresAt: true,
        codeChallenge: true,
        codeChallengeMethod: true,
      },
    }),
  ]);

  if (!app || !app.integrationId) {
    throw new DubApiError({
      code: "unauthorized",
      message: "OAuth app not found for the provided client_id",
    });
  }

  // When PKCE is enabled, the code_verifier is required
  if (app.pkce) {
    if (!codeVerifier) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing code_verifier parameter",
      });
    }
  }

  // When PKCE is not enabled, the client_secret is required
  else if (!app.pkce) {
    if (!clientSecret) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Missing client_secret",
      });
    }

    if (app.hashedClientSecret !== (await hashToken(clientSecret))) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Invalid client_secret",
      });
    }
  }

  if (!accessCode || accessCode.clientId !== clientId) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid code",
    });
  }

  if (app.pkce) {
    const codeChallenge =
      accessCode.codeChallengeMethod === "S256"
        ? await generateCodeChallengeHash(codeVerifier!)
        : codeVerifier;

    if (accessCode.codeChallenge != codeChallenge) {
      throw new DubApiError({
        code: "unauthorized",
        message: "invalid_grant",
      });
    }
  }

  // If the code has expired, delete it and throw an error
  if (accessCode.expiresAt < new Date()) {
    await prisma.oAuthCode.delete({
      where: {
        code,
      },
    });

    throw new DubApiError({
      code: "bad_request",
      message: "Authorization code has expired",
    });
  }

  if (redirectUri !== accessCode.redirectUri) {
    throw new DubApiError({
      code: "bad_request",
      message: "redirect_uri does not match",
    });
  }

  const accessToken = createToken({
    length: OAUTH_CONFIG.ACCESS_TOKEN_LENGTH,
    prefix: OAUTH_CONFIG.ACCESS_TOKEN_PREFIX,
  });

  const refreshToken = createToken({
    length: OAUTH_CONFIG.REFRESH_TOKEN_LENGTH,
  });

  const accessTokenExpires = new Date(
    Date.now() + OAUTH_CONFIG.ACCESS_TOKEN_LIFETIME * 1000,
  );

  const { userId, projectId, scopes } = accessCode;

  // Install the app
  // We only support one token per client per user per workspace at a time
  const installation = await installIntegration({
    userId,
    workspaceId: projectId,
    integrationId: app.integrationId,
  });

  // Create the access token and refresh token
  const restrictedToken = await prisma.restrictedToken.create({
    data: {
      name: generateRandomName(),
      hashedKey: await hashToken(accessToken),
      partialKey: `${accessToken.slice(0, 3)}...${accessToken.slice(-4)}`,
      scopes,
      expires: accessTokenExpires,
      userId,
      projectId,
      installationId: installation.id,
      refreshTokens: {
        create: {
          installationId: installation.id,
          hashedRefreshToken: await hashToken(refreshToken),
          expiresAt: new Date(
            Date.now() + OAUTH_CONFIG.REFRESH_TOKEN_LIFETIME * 1000,
          ),
        },
      },
    },
  });

  waitUntil(
    Promise.all([
      // Delete the code after it's been used
      prisma.oAuthCode.delete({
        where: {
          code,
        },
      }),
      // Remove all existing tokens for this client
      prisma.restrictedToken.deleteMany({
        where: {
          installationId: installation.id,
          id: {
            not: restrictedToken.id,
          },
        },
      }),
      // Update restricted token rate limit to the plan limit
      prisma.project
        .findUnique({
          where: {
            id: projectId,
          },
          select: {
            plan: true,
          },
        })
        .then(async (project) => {
          if (!project?.plan) {
            return;
          }

          await prisma.restrictedToken.update({
            where: { id: restrictedToken.id },
            data: {
              rateLimit: getCurrentPlan(project.plan).limits.api,
            },
          });
        }),
    ]),
  );

  // https://www.oauth.com/oauth2-servers/access-tokens/access-token-response/
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: OAUTH_CONFIG.ACCESS_TOKEN_LIFETIME,
    scope: scopes,
  };
};
