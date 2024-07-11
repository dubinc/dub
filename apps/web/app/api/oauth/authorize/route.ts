import { DubApiError } from "@/lib/api/errors";
import {
  OAUTH_CODE_LENGTH,
  OAUTH_CODE_LIFETIME,
} from "@/lib/api/oauth/constants";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authorizeRequestSchema } from "@/lib/zod/schemas/oauth";
import { nanoid } from "@dub/utils";
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

  const oAuthApp = await prisma.oAuthApp.findUniqueOrThrow({
    where: {
      clientId,
    },
  });

  if (oAuthApp.redirectUri !== redirectUri) {
    throw new DubApiError({
      code: "bad_request",
      message: "Invalid redirect_uri parameter for the application.",
    });
  }

  const { code } = await prisma.oAuthCode.create({
    data: {
      clientId,
      redirectUri,
      projectId: workspace.id,
      userId: session.user.id,
      scopes: scope.join(" "),
      code: nanoid(OAUTH_CODE_LENGTH),
      expiresAt: new Date(Date.now() + OAUTH_CODE_LIFETIME * 1000),
      ...(codeChallenge && { codeChallenge }),
      ...(codeChallengeMethod && { codeChallengeMethod }),
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
