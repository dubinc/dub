import {
  OAUTH_CLIENT_ID_LENGTH,
  OAUTH_CLIENT_SECRET_LENGTH,
  OAUTH_CLIENT_SECRET_PREFIX,
} from "@/lib/api/oauth/constants";
import { parseRequestBody } from "@/lib/api/utils";
import { hashToken, withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOAuthAppSchema, oAuthAppSchema } from "@/lib/zod/schemas/oauth";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

// POST /api/oauth-apps - create a new OAuth apps
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const { name, developer, website, redirectUri } =
      createOAuthAppSchema.parse(await parseRequestBody(req));

    const clientSecret = `${OAUTH_CLIENT_SECRET_PREFIX}${nanoid(OAUTH_CLIENT_SECRET_LENGTH)}`;

    const client = await prisma.oAuthApp.create({
      data: {
        projectId: workspace.id,
        name,
        developer,
        website,
        redirectUri,
        clientId: nanoid(OAUTH_CLIENT_ID_LENGTH),
        clientSecretHashed: await hashToken(clientSecret),
        createdBy: session.user.id,
      },
    });

    console.log({
      ...oAuthAppSchema.parse(client),
      clientSecret,
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
    requiredScopes: ["oauth_apps.write"],
  },
);

// GET /api/oauth-apps - get all OAuth apps for a specific workspace
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
    requiredScopes: ["oauth_apps.read"],
  },
);
