import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { oAuthAppSchema, updateOAuthAppSchema } from "@/lib/zod/schemas/oauth";
import { NextResponse } from "next/server";

// GET /api/integrations/[clientId] – get an integration created by the workspace
export const GET = withWorkspace(
  async ({ params, workspace }) => {
    const app = await prisma.oAuthApp.findFirst({
      where: {
        clientId: params.clientId,
        projectId: workspace.id,
      },
    });

    if (!app) {
      throw new DubApiError({
        code: "not_found",
        message: `OAuth app with id ${params.clientId} not found.`,
      });
    }

    return NextResponse.json(oAuthAppSchema.parse(app));
  },
  {
    requiredPermissions: ["oauth_apps.read"],
    featureFlag: "integrations",
  },
);

// PATCH /api/integrations/[clientId] – update an integration
export const PATCH = withWorkspace(
  async ({ req, params, workspace }) => {
    const { name, slug, developer, website, redirectUri, logo, pkce } =
      updateOAuthAppSchema.parse(await parseRequestBody(req));

    const app = await prisma.oAuthApp.update({
      where: {
        clientId: params.clientId,
        projectId: workspace.id,
      },
      data: {
        name,
        slug,
        developer,
        website,
        redirectUri,
        logo,
        pkce,
      },
    });

    return NextResponse.json(oAuthAppSchema.parse(app));
  },
  {
    requiredPermissions: ["oauth_apps.write"],
    featureFlag: "integrations",
  },
);

// DELETE /api/integrations/[clientId] - delete an integration
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    const app = await prisma.oAuthApp.findFirst({
      where: {
        clientId: params.clientId,
        projectId: workspace.id,
      },
    });

    if (!app) {
      throw new DubApiError({
        code: "not_found",
        message: `OAuth app with id ${params.clientId} not found.`,
      });
    }

    await prisma.oAuthApp.delete({
      where: {
        clientId: params.clientId,
      },
    });

    return NextResponse.json({ id: params.clientId });
  },
  {
    requiredPermissions: ["oauth_apps.write"],
    featureFlag: "integrations",
  },
);
