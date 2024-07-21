import { OAUTH_CONFIG } from "@/lib/api/oauth/constants";
import { createToken } from "@/lib/api/oauth/utils";
import { parseRequestBody } from "@/lib/api/utils";
import { hashToken, withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOAuthAppSchema, oAuthAppSchema } from "@/lib/zod/schemas/oauth";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/integrations - get all integrations created by a workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const apps = await prisma.oAuthApp.findMany({
      where: {
        projectId: workspace.id,
      },
    });

    return NextResponse.json(z.array(oAuthAppSchema).parse(apps));
  },
  {
    requiredPermissions: ["oauth_apps.read"],
    featureFlag: "integrations",
  },
);

// POST /api/integrations - create a new integration
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const { name, slug, developer, website, redirectUri, logo, pkce } =
      createOAuthAppSchema.parse(await parseRequestBody(req));

    const clientId = createToken({
      length: OAUTH_CONFIG.CLIENT_ID_LENGTH,
      prefix: OAUTH_CONFIG.CLIENT_ID_PREFIX,
    });

    const clientSecret = createToken({
      length: OAUTH_CONFIG.CLIENT_SECRET_LENGTH,
      prefix: OAUTH_CONFIG.CLIENT_SECRET_PREFIX,
    });

    const client = await prisma.oAuthApp.create({
      data: {
        projectId: workspace.id,
        name,
        slug,
        developer,
        website,
        redirectUri,
        logo,
        clientId,
        hashedClientSecret: await hashToken(clientSecret),
        userId: session.user.id,
        pkce,
      },
    });

    return NextResponse.json(
      {
        ...oAuthAppSchema.parse(client),
        clientSecret,
      },
      { status: 201 },
    );
  },
  {
    requiredPermissions: ["oauth_apps.write"],
    featureFlag: "integrations",
  },
);
