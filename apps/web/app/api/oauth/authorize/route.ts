import { OAUTH_CODE_LENGTH, OAUTH_CODE_LIFETIME } from "@/lib/api/oauth";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authorizeRequestSchema } from "@/lib/zod/schemas/oauth";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/oauth/authorize - approve OAuth authorization request
export const POST = withWorkspace(async ({ session, req, workspace }) => {
  const body = authorizeRequestSchema.parse(await parseRequestBody(req));
  const { state, client_id: clientId, redirect_uri: redirectUri } = body;

  const oAuthClient = await prisma.oAuthClient.findUniqueOrThrow({
    where: {
      clientId,
    },
  });

  const { code } = await prisma.oAuthCode.create({
    data: {
      clientId,
      redirectUri,
      projectId: workspace.id,
      userId: session.user.id,
      scopes: oAuthClient.scopes,
      code: nanoid(OAUTH_CODE_LENGTH),
      expiresAt: new Date(Date.now() + OAUTH_CODE_LIFETIME * 1000),
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
