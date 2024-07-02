import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { TOKEN_EXPIRY, TOKEN_LENGTHS } from "@/lib/api/oauth";
import { hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { codeExchangeSchema } from "@/lib/zod/schemas/oauth";
import { getCurrentPlan, nanoid } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

// POST /api/oauth/token - exchange `code` for an access token
export async function POST(req: NextRequest) {
  try {
    // Decode application/x-www-form-urlencoded body
    const formData = Object.fromEntries(await req.formData());
    console.log("/api/oauth/token", formData)
    const { client_id, client_secret, code, redirect_uri } =
      codeExchangeSchema.parse(formData);

    const oauthCode = await prisma.oAuthCode.findFirst({
      where: {
        code,
        clientId: client_id,
        redirectUri: redirect_uri,
        app: {
          clientSecretHashed: await hashToken(client_secret),
        },
      },
    });

    if (!oauthCode) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Invalid code",
      });
    }

    const accessToken = `dub_${nanoid(TOKEN_LENGTHS.accessToken)}`;
    const hashedKey = await hashToken(accessToken);
    const partialKey = `${accessToken.slice(0, 3)}...${accessToken.slice(-4)}`;

    const { expires } = await prisma.restrictedToken.create({
      data: {
        name: `OAuth2.0 Access Token`,
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

    const response = {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expires,
      scope: "read write",
    };

    console.log("response", response);

    return NextResponse.json(response);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
