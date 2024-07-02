import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { TOKEN_EXPIRY, TOKEN_LENGTHS } from "@/lib/api/oauth";
import { getAuthTokenOrThrow, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { codeExchangeSchema } from "@/lib/zod/schemas/oauth";
import { getCurrentPlan, nanoid } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

// POST /api/oauth/token - exchange `code` for an access token
export async function POST(req: NextRequest) {
  try {
    const formData = Object.fromEntries(await req.formData());
    const { client_id, client_secret, code, redirect_uri } =
      codeExchangeSchema.parse(formData);

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
        clientId: client_id,
        redirectUri: redirect_uri,
        app: {
          clientSecretHashed: await hashToken(clientSecret),
        },
      },
      select: {
        userId: true,
        projectId: true,
        app: {
          select: {
            id: true,
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

    await prisma.oAuthCode.delete({
      where: {
        code,
      },
    });

    const accessToken = `dub_${nanoid(TOKEN_LENGTHS.accessToken)}`;
    const hashedKey = await hashToken(accessToken);
    const partialKey = `${accessToken.slice(0, 3)}...${accessToken.slice(-4)}`;

    const { expires } = await prisma.restrictedToken.create({
      data: {
        name: `Access token for ${oauthCode.app.name}`,
        hashedKey,
        partialKey,
        userId: oauthCode.userId,
        projectId: oauthCode.projectId,
        rateLimit: getCurrentPlan("free").limits.api,
        expires: new Date(Date.now() + TOKEN_EXPIRY.accessToken),
        scopes: "",
        // scopes && scopes.length > 0 ? [...new Set(scopes)].join(" ") : null,
      },
    });

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expires,
      scope: "read write",
      refresh_token: accessToken,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
