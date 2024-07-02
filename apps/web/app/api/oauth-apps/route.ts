import { TOKEN_LENGTHS } from "@/lib/api/oauth";
import { parseRequestBody } from "@/lib/api/utils";
import { hashToken, withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOAuthAppSchema, oAuthAppSchema } from "@/lib/zod/schemas/oauth";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

// POST /api/oauth-apps - create a new OAuth app
export const POST = withWorkspace(async ({ req, workspace }) => {
  const { name, description, website, redirectUri, scopes } =
    createOAuthAppSchema.parse(await parseRequestBody(req));

  const clientSecret = `dub_${nanoid(TOKEN_LENGTHS.clientSecret)}`;

  const app = await prisma.oAuthApp.create({
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

// GET /api/oauth-apps - get all OAuth apps for a specific workspace
export const GET = withWorkspace(async ({ workspace }) => {
  const apps = await prisma.oAuthApp.findMany({
    where: {
      projectId: workspace.id,
    },
  });

  return NextResponse.json(z.array(oAuthAppSchema).parse(apps));
});
