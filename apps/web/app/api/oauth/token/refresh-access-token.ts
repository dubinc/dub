import { DubApiError } from "@/lib/api/errors";
import { TOKEN_EXPIRY, TOKEN_LENGTH } from "@/lib/api/oauth";
import { getAuthTokenOrThrow, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { refreshTokenSchema } from "@/lib/zod/schemas/oauth";
import { getCurrentPlan, nanoid } from "@dub/utils";
import { NextRequest } from "next/server";

// Get new access token using refresh token
export const refreshAccessToken = async (
  req: NextRequest,
  params: z.infer<typeof refreshTokenSchema>,
) => {
  const { client_id, client_secret, refresh_token: refreshToken } = params;

  let clientId: string | undefined = client_id;
  let clientSecret: string | undefined = client_secret;

  // If no client_id or client_secret is provided in the request body
  // then it should be provided in the Authorization header as Basic Auth
  if (!clientId && !clientSecret) {
    const token = getAuthTokenOrThrow(req, "Basic");
    const splits = Buffer.from(token, "base64").toString("utf-8").split(":");

    if (splits.length > 1) {
      clientId = splits[0];
      clientSecret = splits[1];
    }
  }

  if (!clientId || !clientSecret) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid client credentials",
    });
  }

  const app = await prisma.oAuthClient.findFirst({
    where: {
      clientId,
      clientSecretHashed: await hashToken(clientSecret),
    },
    select: {
      name: true,
    },
  });

  if (!app) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid client credentials",
    });
  }

  const refreshTokenRecord = await prisma.oAuthRefreshToken.findFirst({
    where: {
      clientId,
      refreshTokenHashed: await hashToken(refreshToken),
    },
    select: {
      id: true,
      accessToken: {
        select: {
          id: true,
          name: true,
          userId: true,
          projectId: true,
          scopes: true,
          project: {
            select: {
              plan: true,
            },
          },
        },
      },
    },
  });

  if (!refreshTokenRecord) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Refresh token not found or invalid",
    });
  }

  const { accessToken, id: refreshTokenId } = refreshTokenRecord;
  const {
    userId,
    projectId,
    scopes,
    name,
    project: workspace,
    id: accessTokenId,
  } = accessToken;

  const newAccessToken = `dub_${nanoid(TOKEN_LENGTH.accessToken)}`;
  const newRefreshToken = `dub_${nanoid(TOKEN_LENGTH.refreshToken)}`;
  const accessTokenExpires = new Date(Date.now() + TOKEN_EXPIRY.accessToken);

  await Promise.all([
    // Create the access token and refresh token
    prisma.restrictedToken.create({
      data: {
        userId,
        projectId,
        scopes,
        name,
        hashedKey: await hashToken(newAccessToken),
        partialKey: `${newAccessToken.slice(0, 3)}...${newAccessToken.slice(-4)}`,
        rateLimit: getCurrentPlan(workspace.plan as string).limits.api,
        expires: accessTokenExpires,
        refreshTokens: {
          create: {
            clientId,
            refreshTokenHashed: await hashToken(newRefreshToken),
            expiresAt: new Date(Date.now() + TOKEN_EXPIRY.refreshToken),
          },
        },
      },
    }),

    // Delete the old access token
    prisma.restrictedToken.delete({
      where: {
        id: accessTokenId,
      },
    }),

    // Delete the old refresh token
    prisma.oAuthRefreshToken.delete({
      where: {
        id: refreshTokenId,
      },
    }),
  ]);

  const response = {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token_type: "Bearer",
    expires_in: Math.floor(accessTokenExpires.getTime() / 1000), // TODO: Fix this
  };

  console.log("Access token refreshed", response);

  return response;
};
