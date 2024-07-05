import { TOKEN_EXPIRY, TOKEN_LENGTH } from "@/lib/api/oauth";
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

  console.info("Authorize request", {
    workspaceId: workspace.id,
    state,
    clientId,
    redirectUri,
  });

  const { code } = await prisma.oAuthCode.create({
    data: {
      clientId,
      redirectUri,
      projectId: workspace.id,
      userId: session.user.id,
      scopes: oAuthClient.scopes,
      code: nanoid(TOKEN_LENGTH.code),
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY.code),
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
