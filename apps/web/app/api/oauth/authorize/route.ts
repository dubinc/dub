import { DubApiError } from "@/lib/api/errors";
import { OAUTH_CONFIG } from "@/lib/api/oauth/constants";
import { createToken } from "@/lib/api/oauth/utils";
import { consolidateScopes, getScopesForRole } from "@/lib/api/tokens/scopes";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { authorizeRequestSchema } from "@/lib/zod/schemas/oauth";
import { prisma } from "@dub/prisma";
import { SHOPIFY_INTEGRATION_ID, STRIPE_INTEGRATION_ID } from "@dub/utils";
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

  // Check if the user has the required scopes for the workspace selected
  const userRole = workspace.users[0].role;
  const scopesForRole = getScopesForRole(userRole);
  const scopesMissing = consolidateScopes(scope).filter(
    (scope) => !scopesForRole.includes(scope) && scope !== "user.read",
  );

  if (scopesMissing.length > 0) {
    throw new DubApiError({
      code: "bad_request",
      message: "You don't have the permission to install this integration.",
    });
  }

  const app = await prisma.oAuthApp.findUniqueOrThrow({
    where: {
      clientId,
    },
    select: {
      redirectUris: true,
      pkce: true,
      integrationId: true,
    },
  });

  if (
    [STRIPE_INTEGRATION_ID, SHOPIFY_INTEGRATION_ID].includes(
      app.integrationId,
    ) &&
    (workspace.plan === "free" || workspace.plan === "pro")
  ) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "This integration is only available for workspaces with a Business plan or higher. Please upgrade your plan to continue.",
    });
  }

  const redirectUris = (app.redirectUris || []) as string[];

  if (!redirectUris.includes(redirectUri)) {
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

  // Generate the callback URL
  const callbackUrl = new URL(redirectUri);

  callbackUrl.searchParams.set("code", code);

  if (state) {
    callbackUrl.searchParams.set("state", state);
  }

  const response = {
    callbackUrl: callbackUrl.toString(),
  };

  return NextResponse.json(response);
});
