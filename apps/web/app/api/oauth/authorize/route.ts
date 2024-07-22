import { DubApiError } from "@/lib/api/errors";
import { OAUTH_CONFIG } from "@/lib/api/oauth/constants";
import { createToken } from "@/lib/api/oauth/utils";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authorizeRequestSchema } from "@/lib/zod/schemas/oauth";
import { NextResponse } from "next/server";

// POST /api/oauth/authorize - approve OAuth authorization request
export const POST = withWorkspace(async ({ session, req, workspace }) => {
  const {
    state,
    scope,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
  } = authorizeRequestSchema.parse(await parseRequestBody(req));

  const app = await prisma.oAuthApp.findUniqueOrThrow({
    where: {
      clientId,
    },
    select: {
      redirectUri: true,
      pkce: true,
    },
  });

  if (app.redirectUri !== redirectUri) {
    throw new DubApiError({
      code: "bad_request",
      message: "Invalid redirect_uri parameter for the application.",
    });
  }

  // If PKCE is required, ensure that the code_challenge and code_challenge_method are present
  if (app.pkce && (!codeChallenge || !codeChallengeMethod)) {
    throw new DubApiError({
      code: "bad_request",
      message: "Missing code_challenge or code_challenge_method parameters.",
    });
  }

  const { code } = await prisma.oAuthCode.create({
    data: {
      clientId,
      redirectUri,
      projectId: workspace.id,
      userId: session.user.id,
      scopes: scope.join(" "),
      code: createToken({ length: OAUTH_CONFIG.CODE_LENGTH }),
      expiresAt: new Date(Date.now() + OAUTH_CONFIG.CODE_LIFETIME * 1000),
      ...(app.pkce && { codeChallenge, codeChallengeMethod }),
    },
  });

  const searchParams = new URLSearchParams({
    code,
    ...(state && { state }),
  });

  const response = {
    callbackUrl: `${redirectUri}?${searchParams.toString()}`,
  };

  return NextResponse.json(response);
});
