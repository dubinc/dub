import { TOKEN_LENGTHS } from "@/lib/api/oauth";
import { parseRequestBody } from "@/lib/api/utils";
import { hashToken, withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createOAuthAppSchema,
  oAuthAppSchema,
} from "@/lib/zod/schemas/oauth-app";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

// POST /api/oauth-apps - create a new oauth app
export const POST = withWorkspace(async ({ req, workspace }) => {
  const { name, description, website, redirectUri, scopes } =
    createOAuthAppSchema.parse(await parseRequestBody(req));

  const clientSecret = `dub_${nanoid(TOKEN_LENGTHS.clientSecret)}`;

  const app = await prisma.oAuthClient.create({
    data: {
      projectId: workspace.id,
      name,
      description,
      website,
      redirectUri,
      scopes: scopes ? scopes.join(",") : null,
      clientId: nanoid(TOKEN_LENGTHS.clientId),
      clientSecretHashed: await hashToken(clientSecret),
    },
  });

  return NextResponse.json(
    {
      ...oAuthAppSchema.parse(app),
      clientSecret,
    },
    { status: 201 },
  );
});

// GET /api/oauth-apps - get all oauth apps for a specific workspace
export const GET = withWorkspace(async ({ req, workspace }) => {
  const apps = await prisma.oAuthClient.findMany({
    where: {
      projectId: workspace.id,
    },
  });

  return NextResponse.json(z.array(oAuthAppSchema).parse(apps));
});
