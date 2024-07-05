import {
  OAUTH_CLIENT_ID_LENGTH,
  OAUTH_CLIENT_SECRET_LENGTH,
  OAUTH_CLIENT_SECRET_PREFIX,
} from "@/lib/api/oauth";
import { parseRequestBody } from "@/lib/api/utils";
import { hashToken, withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createOAuthClientSchema,
  oAuthClientSchema,
} from "@/lib/zod/schemas/oauth";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

// POST /api/oauth-clients - create a new OAuth client
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { name, developer, website, redirectUri, scopes } =
      createOAuthClientSchema.parse(await parseRequestBody(req));

    const clientSecret = `${OAUTH_CLIENT_SECRET_PREFIX}${nanoid(OAUTH_CLIENT_SECRET_LENGTH)}`;

    const client = await prisma.oAuthClient.create({
      data: {
        projectId: workspace.id,
        name,
        developer,
        website,
        redirectUri,
        scopes: [...new Set(scopes)].join(" "),
        clientId: nanoid(OAUTH_CLIENT_ID_LENGTH),
        clientSecretHashed: await hashToken(clientSecret),
      },
    });

    return NextResponse.json(
      {
        ...oAuthClientSchema.parse(client),
        clientSecret,
      },
      { status: 201 },
    );
  },
  {
    requiredScopes: ["oauth_apps.write"],
  },
);

// GET /api/oauth-clients - get all OAuth clients for a specific workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const clients = await prisma.oAuthClient.findMany({
      where: {
        projectId: workspace.id,
      },
    });

    return NextResponse.json(z.array(oAuthClientSchema).parse(clients));
  },
  {
    requiredScopes: ["oauth_apps.read"],
  },
);
