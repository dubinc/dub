import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { installIntegration } from "@/lib/integrations/install";
import { prisma } from "@dub/prisma";
import { SHOPIFY_INTEGRATION_ID } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateWorkspaceSchema = z.object({
  shopifyStoreId: z.string().nullable(),
});

// PATCH /api/shopify/integration/callback – update a shopify store id
export const PATCH = withWorkspace(
  async ({ req, workspace, session }) => {
    const body = await parseRequestBody(req);
    const { shopifyStoreId } = updateWorkspaceSchema.parse(body);

    try {
      const response = await prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          shopifyStoreId,
        },
        select: {
          shopifyStoreId: true,
        },
      });

      waitUntil(
        (async () => {
          const installation = await prisma.installedIntegration.findUnique({
            where: {
              userId_integrationId_projectId: {
                userId: session.user.id,
                projectId: workspace.id,
                integrationId: SHOPIFY_INTEGRATION_ID,
              },
            },
            select: {
              id: true,
            },
          });

          // Install the integration if it doesn't exist
          if (!installation) {
            await installIntegration({
              userId: session.user.id,
              workspaceId: workspace.id,
              integrationId: SHOPIFY_INTEGRATION_ID,
              credentials: {
                shopifyStoreId,
              },
            });
          }

          // Uninstall the integration if the shopify store id is null
          if (installation && shopifyStoreId === null) {
            await prisma.installedIntegration.delete({
              where: {
                id: installation.id,
              },
            });
          }
        })(),
      );

      return NextResponse.json(response);
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: `The shopify store "${shopifyStoreId}" is already in use.`,
        });
      }

      throw new DubApiError({
        code: "internal_server_error",
        message: error.message,
      });
    }
  },
  {
    requiredPermissions: ["workspaces.write"],
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
