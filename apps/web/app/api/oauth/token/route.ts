import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { TOKEN_EXPIRY, TOKEN_LENGTH } from "@/lib/api/oauth";
import { getAuthTokenOrThrow, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { codeExchangeSchema } from "@/lib/zod/schemas/oauth";
import { getCurrentPlan, nanoid } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

// POST /api/oauth/token - exchange `code` for an access token
export async function POST(req: NextRequest) {
  try {
    const formData = Object.fromEntries(await req.formData());
    const {
      client_id,
      client_secret,
      code,
      redirect_uri: redirectUri,
    } = codeExchangeSchema.parse(formData);

    let clientId = client_id;
    let clientSecret = client_secret;

    if (!client_id && !client_secret) {
      // came in the format {client_id}:{client_secret}
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

    const oauthCode = await prisma.oAuthCode.findFirst({
      where: {
        code,
        clientId,
        redirectUri,
        app: {
          clientSecretHashed: await hashToken(clientSecret),
        },
      },
      select: {
        userId: true,
        projectId: true,
        scopes: true,
        expiresAt: true,
        app: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!oauthCode) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Invalid code",
      });
    }

    if (oauthCode.expiresAt < new Date()) {
      await prisma.oAuthCode.delete({
        where: {
          code,
        },
      });

      throw new DubApiError({
        code: "bad_request",
        message: "Authorization code has expired.",
      });
    }

    const workspace = await prisma.project.findUnique({
      where: {
        id: oauthCode.projectId,
      },
      select: {
        plan: true,
      },
    });

    const accessToken = `dub_${nanoid(TOKEN_LENGTH.accessToken)}`;
    const expires = new Date(Date.now() + TOKEN_EXPIRY.accessToken);
    const expiresInSeconds = Math.floor(expires.getTime() / 1000);

    await Promise.all([
      // Create the access token
      prisma.restrictedToken.create({
        data: {
          name: `Access token for ${oauthCode.app.name}`,
          hashedKey: await hashToken(accessToken),
          partialKey: `${accessToken.slice(0, 3)}...${accessToken.slice(-4)}`,
          userId: oauthCode.userId,
          projectId: oauthCode.projectId,
          scopes: oauthCode.scopes,
          rateLimit: getCurrentPlan(workspace?.plan as string).limits.api,
          expires: new Date(Date.now() + TOKEN_EXPIRY.accessToken),
        },
      }),

      // Delete the code after it's been used
      prisma.oAuthCode.delete({
        where: {
          code,
        },
      }),
    ]);

    console.log("Token exchange", {
      access_token: accessToken,
      refresh_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresInSeconds,
    });

    return NextResponse.json({
      access_token: accessToken,
      refresh_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresInSeconds,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
