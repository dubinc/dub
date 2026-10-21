import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  deleteScreenshots,
  throwIfForeignScreenshots,
} from "@/lib/integrations/utils";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { getOwnedAssetKey, mintAssetKey } from "@/lib/storage/asset-keys";
import { oAuthAppSchema, updateOAuthAppSchema } from "@/lib/zod/schemas/oauth";
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
    } = await updateOAuthAppSchema.parseAsync(await parseRequestBody(req));

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

      throwIfForeignScreenshots({
        screenshots,
        workspaceId: workspace.id,
        existingScreenshots: integration.screenshots,
      });

      let logoUrl: string | undefined;
      const logoUpdated = logo && integration.logo !== logo;

      // Logo has been changed
      if (logoUpdated) {
        const result = await storage.upload({
          key: mintAssetKey("integrationLogo", params.appId).key,
          body: logo,
        });

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
        include: {
          oAuthApp: true,
        },
      });

      waitUntil(
        (async () => {
          const oldLogoKey = logoUpdated
            ? getOwnedAssetKey({
                kind: "integrationLogo",
                ownerId: params.appId,
                url: integration.logo,
              })
            : null;

          if (oldLogoKey) {
            await storage.delete({
              key: oldLogoKey,
            });
          }

          // Remove old screenshots
          const oldScreenshots = Array.isArray(integration.screenshots)
            ? integration.screenshots
            : [];

          const removedScreenshots = oldScreenshots.filter(
            (s) => typeof s === "string" && !screenshots?.includes(s),
          );

          await deleteScreenshots({
            screenshots: removedScreenshots,
            workspaceId: workspace.id,
          });
        })(),
      );

      const { oAuthApp, ...updatedIntegration } = updatedRecord;

      return NextResponse.json(
        oAuthAppSchema.parse({ ...oAuthApp, ...updatedIntegration }),
      );
    } catch (error) {
      if (error instanceof DubApiError) {
        throw error;
      }

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
        const logoKey = getOwnedAssetKey({
          kind: "integrationLogo",
          ownerId: integration.id,
          url: integration.logo,
        });

        if (logoKey) {
          await storage.delete({
            key: logoKey,
          });
        }

        await deleteScreenshots({
          screenshots: integration.screenshots,
          workspaceId: workspace.id,
        });
      })(),
    );

    return NextResponse.json({ id: params.appId });
  },
  {
    requiredPermissions: ["oauth_apps.write"],
  },
);
