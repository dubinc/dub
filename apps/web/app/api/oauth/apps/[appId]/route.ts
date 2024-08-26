import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { deleteScreenshots } from "@/lib/integrations/utils";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { oAuthAppSchema, updateOAuthAppSchema } from "@/lib/zod/schemas/oauth";
import { nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/oauth/apps/[appId] – get an OAuth app created by the workspace
export const GET = withWorkspace(
  async ({ params, workspace }) => {
    const oAuthApp = await prisma.oAuthApp.findFirst({
      where: {
        integration: {
          id: params.appId,
          projectId: workspace.id,
        },
      },
      select: {
        clientId: true,
        partialClientSecret: true,
        redirectUris: true,
        pkce: true,
        integration: true,
      },
    });

    if (!oAuthApp) {
      throw new DubApiError({
        code: "not_found",
        message: `OAuth app with id ${params.appId} not found.`,
      });
    }

    const { integration, ...app } = oAuthApp;

    return NextResponse.json(
      oAuthAppSchema.parse({
        ...app,
        ...integration,
      }),
    );
  },
  {
    requiredPermissions: ["oauth_apps.read"],
    featureFlag: "integrations",
  },
);

// PATCH /api/oauth/apps/[appId] – update an OAuth app
export const PATCH = withWorkspace(
  async ({ req, params, workspace }) => {
    const {
      name,
      slug,
      developer,
      website,
      installUrl,
      description,
      readme,
      redirectUris,
      logo,
      pkce,
      screenshots,
    } = updateOAuthAppSchema.parse(await parseRequestBody(req));

    try {
      const integration = await prisma.integration.findUniqueOrThrow({
        where: {
          id: params.appId,
          projectId: workspace.id,
        },
        select: {
          logo: true,
          screenshots: true,
        },
      });

      let logoUrl: string | undefined;
      const logoUpdated = logo && integration.logo !== logo;

      // Logo has been changed
      if (logoUpdated) {
        const result = await storage.upload(
          `integrations/${params.appId}_${nanoid(7)}`,
          logo,
        );

        logoUrl = result.url;
      }

      const updatedRecord = await prisma.integration.update({
        where: {
          id: params.appId,
          projectId: workspace.id,
        },
        data: {
          name,
          slug,
          developer,
          website,
          installUrl,
          description,
          readme,
          screenshots,
          ...(logoUrl && { logo: logoUrl }),
          oAuthApp: {
            update: {
              redirectUris,
              pkce,
            },
          },
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          name: true,
          slug: true,
          description: true,
          developer: true,
          logo: true,
          website: true,
          installUrl: true,
          readme: true,
          screenshots: true,
          verified: true,
          oAuthApp: true,
        },
      });

      waitUntil(
        (async () => {
          if (
            logoUpdated &&
            integration.logo &&
            integration.logo.startsWith(
              `${R2_URL}/integrations/${params.appId}`,
            )
          ) {
            await storage.delete(integration.logo.replace(`${R2_URL}/`, ""));
          }

          // Remove old screenshots
          const oldScreenshots = integration.screenshots
            ? (integration.screenshots as string[])
            : [];

          const removedScreenshots = oldScreenshots?.filter(
            (s) => !screenshots?.includes(s),
          );

          await deleteScreenshots(removedScreenshots);
        })(),
      );

      const { oAuthApp, ...updatedIntegration } = updatedRecord;

      return NextResponse.json(
        oAuthAppSchema.parse({ ...oAuthApp, ...updatedIntegration }),
      );
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: `The slug "${slug}" is already in use.`,
        });
      } else {
        throw new DubApiError({
          code: "internal_server_error",
          message: error.message,
        });
      }
    }
  },
  {
    requiredPermissions: ["oauth_apps.write"],
    featureFlag: "integrations",
  },
);

// DELETE /api/oauth/apps/[appId] - delete an OAuth app
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    const integration = await prisma.integration.findFirst({
      where: {
        id: params.appId,
        projectId: workspace.id,
      },
    });

    if (!integration) {
      throw new DubApiError({
        code: "not_found",
        message: `OAuth app with id ${params.appId} not found.`,
      });
    }

    await prisma.integration.delete({
      where: {
        id: params.appId,
      },
    });

    waitUntil(
      (async () => {
        if (
          integration.logo &&
          integration.logo.startsWith(`${R2_URL}/integrations`)
        ) {
          await storage.delete(integration.logo.replace(`${R2_URL}/`, ""));
        }

        await deleteScreenshots(integration.screenshots);
      })(),
    );

    return NextResponse.json({ id: params.appId });
  },
  {
    requiredPermissions: ["oauth_apps.write"],
    featureFlag: "integrations",
  },
);
