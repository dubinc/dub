import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { installIntegration } from "@/lib/integrations/install";
import z from "@/lib/zod";
import { prisma } from "@dub/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const updateWorkspaceSchema = z.object({
  stripeAccountId: z.string().nullable(),
});

// PATCH /api/stripe/integration - update a workspace with a stripe connect account id
export const PATCH = withWorkspace(
  async ({ req, workspace, session }) => {
    const body = await parseRequestBody(req);
    const { stripeAccountId } = updateWorkspaceSchema.parse(body);

    try {
      const response = await prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          stripeConnectId: stripeAccountId,
        },
        select: {
          stripeConnectId: true,
        },
      });

      waitUntil(
        (async () => {
          const installation = await prisma.installedIntegration.findUnique({
            where: {
              userId_integrationId_projectId: {
                userId: session.user.id,
                projectId: workspace.id,
                integrationId: STRIPE_INTEGRATION_ID,
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
              integrationId: STRIPE_INTEGRATION_ID,
              credentials: {
                stripeConnectId: stripeAccountId,
              },
            });
          }

          // Uninstall the integration if the stripe account id is null
          if (installation && stripeAccountId === null) {
            await prisma.installedIntegration.delete({
              where: {
                id: installation.id,
              },
            });
          }
        })(),
      );

      return NextResponse.json(response, {
        headers: CORS_HEADERS,
      });
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: `The stripe connect account "${stripeAccountId}" is already in use.`,
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

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
