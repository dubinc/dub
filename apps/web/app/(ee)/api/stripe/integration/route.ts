import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { stripeIntegrationSettingsSchema } from "@/lib/integrations/stripe/schema";
import { prisma } from "@dub/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const CORS_HEADERS = new Headers({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});

// PATCH /api/stripe/integration - update a workspace with a stripe connect account id
export const PATCH = withWorkspace(
  async ({ req, workspace, token }) => {
    const body = await parseRequestBody(req);
    const { stripeAccountId, stripeMode } = z
      .object({
        stripeAccountId: z.string().nullable(),
        stripeMode: stripeIntegrationSettingsSchema.shape.stripeMode,
      })
      .parse(body);

    if (!token?.installationId) {
      throw new DubApiError({
        code: "forbidden",
        message: "You are not authorized to update the Stripe integration.",
      });
    }

    const installation = await prisma.installedIntegration.findUnique({
      where: {
        id: token.installationId,
      },
      select: {
        id: true,
        integrationId: true,
        settings: true,
      },
    });

    if (!installation || installation.integrationId !== STRIPE_INTEGRATION_ID) {
      throw new DubApiError({
        code: "forbidden",
        message: "You are not authorized to update the Stripe integration.",
      });
    }

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
          // Uninstall the integration if the stripe account id is null
          if (installation && stripeAccountId === null) {
            await prisma.installedIntegration.delete({
              where: {
                id: installation.id,
              },
            });
            // else, update the Stripe mode for the installation
          } else {
            await prisma.installedIntegration.update({
              where: {
                id: installation.id,
              },
              data: {
                settings: {
                  ...((installation?.settings as any) || {}),
                  stripeMode,
                },
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
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
    requiredRoles: ["owner", "member"],
  },
);

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
