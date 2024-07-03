import { TOKEN_LENGTH } from "@/lib/api/oauth";
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
    const { name, description, website, redirectUri, scopes } =
      createOAuthClientSchema.parse(await parseRequestBody(req));

    const clientSecret = `dub_${nanoid(TOKEN_LENGTH.clientSecret)}`;

    const client = await prisma.oAuthClient.create({
      data: {
        projectId: workspace.id,
        name,
        description,
        website,
        redirectUri,
        scopes:
          scopes && scopes.length > 0 ? [...new Set(scopes)].join(" ") : null,
        clientId: nanoid(TOKEN_LENGTH.clientId),
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
