import { DubApiError } from "@/lib/api/errors";
import { OAUTH_CONFIG } from "@/lib/api/oauth/constants";
import { createToken } from "@/lib/api/oauth/utils";
import { hashToken } from "@/lib/auth";
import { generateRandomName } from "@/lib/names";
import z from "@/lib/zod";
import { refreshTokenSchema } from "@/lib/zod/schemas/oauth";
import { prisma } from "@dub/prisma";
import { getCurrentPlan } from "@dub/utils";
import { NextRequest } from "next/server";

// Get new access token using refresh token
export const refreshAccessToken = async (
  req: NextRequest,
  params: z.infer<typeof refreshTokenSchema>,
) => {
  let {
    refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  } = params;

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

  const oAuthApp = await prisma.oAuthApp.findUnique({
    where: {
      clientId,
    },
    select: {
      pkce: true,
      integrationId: true,
      hashedClientSecret: true,
    },
  });

  if (!oAuthApp) {
    throw new DubApiError({
      code: "unauthorized",
      message: "OAuth app not found for the provided client_id",
    });
  }

  if (!oAuthApp.pkce) {
    if (!clientSecret) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Missing client_secret",
      });
    }

    if (oAuthApp.hashedClientSecret !== (await hashToken(clientSecret))) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Invalid client_secret",
      });
    }
  }

  const refreshTokenRecord = await prisma.oAuthRefreshToken.findUnique({
    where: {
      hashedRefreshToken: await hashToken(refresh_token),
    },
    select: {
      id: true,
      accessTokenId: true,
      installationId: true,
      expiresAt: true,
      accessToken: {
        select: {
          id: true,
          scopes: true,
        },
      },
    },
  });

  if (!refreshTokenRecord) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Refresh token not found.",
    });
  }

  if (refreshTokenRecord.expiresAt < new Date()) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Refresh token expired.",
    });
  }

  const authorizedApp = await prisma.installedIntegration.findUnique({
    where: {
      id: refreshTokenRecord.installationId,
    },
    select: {
      id: true,
      userId: true,
      projectId: true,
      integration: {
        select: {
          oAuthApp: {
            select: {
              clientId: true,
            },
          },
        },
      },
      project: {
        select: {
          plan: true,
        },
      },
    },
  });

  if (!authorizedApp) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Integration installation not found.",
    });
  }

  const { accessToken } = refreshTokenRecord;
  const { integration } = authorizedApp;

  if (integration.oAuthApp?.clientId !== clientId) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Client ID mismatch.",
    });
  }

  const newAccessToken = createToken({
    length: OAUTH_CONFIG.ACCESS_TOKEN_LENGTH,
    prefix: OAUTH_CONFIG.ACCESS_TOKEN_PREFIX,
  });

  const newRefreshToken = createToken({
    length: OAUTH_CONFIG.REFRESH_TOKEN_LENGTH,
  });

  const accessTokenExpires = new Date(
    Date.now() + OAUTH_CONFIG.ACCESS_TOKEN_LIFETIME * 1000,
  );

  await prisma.$transaction([
    // Delete the old access token
    prisma.restrictedToken.delete({
      where: {
        id: accessToken.id,
      },
    }),

    // Create the access token and refresh token
    prisma.restrictedToken.create({
      data: {
        name: generateRandomName(),
        hashedKey: await hashToken(newAccessToken),
        partialKey: `${newAccessToken.slice(0, 3)}...${newAccessToken.slice(-4)}`,
        scopes: accessToken.scopes,
        expires: accessTokenExpires,
        rateLimit: getCurrentPlan(authorizedApp.project.plan as string).limits
          .api,
        userId: authorizedApp.userId,
        projectId: authorizedApp.projectId,
        installationId: authorizedApp.id,
        refreshTokens: {
          create: {
            installationId: authorizedApp.id,
            hashedRefreshToken: await hashToken(newRefreshToken),
            expiresAt: new Date(
              Date.now() + OAUTH_CONFIG.REFRESH_TOKEN_LIFETIME * 1000,
            ),
          },
        },
      },
    }),
  ]);

  // https://www.oauth.com/oauth2-servers/making-authenticated-requests/refreshing-an-access-token/
  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token_type: "Bearer",
    expires_in: OAUTH_CONFIG.ACCESS_TOKEN_LIFETIME,
  };
};
