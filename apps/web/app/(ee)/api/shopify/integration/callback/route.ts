import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { installIntegration } from "@/lib/integrations/install";
import { prisma } from "@dub/prisma";
import { SHOPIFY_INTEGRATION_ID } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("connect"),
    shopifyStoreId: z.string().min(1),
    accessToken: z.string().min(1),
    scope: z.string().min(1),
  }),

  z.object({
    action: z.literal("disconnect"),
    shopifyStoreId: z.literal(null),
  }),
]);

// PATCH /api/shopify/integration/callback – update a shopify store id
export const PATCH = withWorkspace(
  async ({ req, workspace, session }) => {
    const body = requestSchema.parse(await parseRequestBody(req));

    try {
      const response = await prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          shopifyStoreId: body.shopifyStoreId,
        },
        select: {
          shopifyStoreId: true,
        },
      });

      // Install the integration
      if (body.action === "connect") {
        await installIntegration({
          userId: session.user.id,
          workspaceId: workspace.id,
          integrationId: SHOPIFY_INTEGRATION_ID,
          credentials: {
            accessToken: body.accessToken,
            scope: body.scope,
          },
        });
      }

      // Uninstall the integration
      if (body.action === "disconnect") {
        try {
          await prisma.installedIntegration.delete({
            where: {
              userId_integrationId_projectId: {
                userId: session.user.id,
                integrationId: SHOPIFY_INTEGRATION_ID,
                projectId: workspace.id,
              },
            },
          });
        } catch {}
      }

      return NextResponse.json(response);
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: `The shopify store "${body.shopifyStoreId}" is already in use.`,
        });
      }

      throw new DubApiError({
        code: "internal_server_error",
        message: error.message,
      });
    }
  },
  {
    requiredRoles: ["owner", "member"],
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
