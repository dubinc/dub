import { DubApiError } from "@/lib/api/errors";
import { TOKEN_EXPIRY, TOKEN_LENGTH, TOKEN_PREFIX } from "@/lib/api/oauth";
import { getAuthTokenOrThrow, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { authCodeExchangeSchema } from "@/lib/zod/schemas/oauth";
import { getCurrentPlan, nanoid } from "@dub/utils";
import { NextRequest } from "next/server";

// Exchange authorization code with access token
export const exchangeAuthCodeForToken = async (
  req: NextRequest,
  params: z.infer<typeof authCodeExchangeSchema>,
) => {
  const { client_id, client_secret, code, redirect_uri: redirectUri } = params;

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

  const accessCode = await prisma.oAuthCode.findUnique({
    where: {
      code,
      clientId,
    },
    select: {
      userId: true,
      projectId: true,
      scopes: true,
      redirectUri: true,
      expiresAt: true,
    },
  });

  if (!accessCode) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid code",
    });
  }

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

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: accessCode.projectId,
    },
    select: {
      plan: true,
    },
  });

  const { userId, projectId, scopes } = accessCode;

  const accessToken = `${TOKEN_PREFIX.accessToken}${nanoid(TOKEN_LENGTH.accessToken)}`;
  const refreshToken = `${TOKEN_PREFIX.refreshToken}${nanoid(TOKEN_LENGTH.refreshToken)}`;
  const accessTokenExpires = new Date(Date.now() + TOKEN_EXPIRY.accessToken);

  // Delete the existing token issued to the client for the user for the selected workspace before creating a new one
  // We only support one token per client per user per workspace at a time
  await prisma.$transaction([
    prisma.restrictedToken.deleteMany({
      where: {
        userId,
        projectId,
        clientId,
      },
    }),

    prisma.oAuthAuthorizedApp.deleteMany({
      where: {
        userId,
        projectId,
        clientId,
      },
    }),
  ]);

  await prisma.$transaction([
    // Create the access token and refresh token
    prisma.restrictedToken.create({
      data: {
        clientId,
        userId,
        projectId,
        scopes,
        name: `Access token for ${app.name}`,
        hashedKey: await hashToken(accessToken),
        partialKey: `${accessToken.slice(0, 3)}...${accessToken.slice(-4)}`,
        rateLimit: getCurrentPlan(workspace.plan as string).limits.api,
        expires: accessTokenExpires,
        refreshTokens: {
          create: {
            clientId,
            refreshTokenHashed: await hashToken(refreshToken),
            expiresAt: new Date(Date.now() + TOKEN_EXPIRY.refreshToken),
          },
        },
      },
    }),

    // Delete the code after it's been used
    prisma.oAuthCode.delete({
      where: {
        code,
      },
    }),

    // Add to authorized apps
    prisma.oAuthAuthorizedApp.create({
      data: {
        clientId,
        userId,
        projectId,
      },
    }),
  ]);

  const response = {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: Math.floor(accessTokenExpires.getTime() / 1000), // TODO: Fix this
  };

  return response;
};
