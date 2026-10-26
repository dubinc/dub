import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import { StripeConnectMode } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const CORS_HEADERS = new Headers({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});

const updateStripeIntegrationSchema = z.object({
  stripeAccountId: z.string().nullable(), // null on disconnect
  stripeMode: z.enum(StripeConnectMode).optional().default("live"),
});

// PATCH /api/stripe/integration - update a workspace with a stripe connect account id
export const PATCH = withWorkspace(
  async ({ req, workspace, token }) => {
    const body = await parseRequestBody(req);
    const { stripeAccountId, stripeMode } =
      updateStripeIntegrationSchema.parse(body);

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
      },
    });

    if (!installation || installation.integrationId !== STRIPE_INTEGRATION_ID) {
      throw new DubApiError({
        code: "forbidden",
        message: "You are not authorized to update the Stripe integration.",
      });
    }

    try {
      const response = await prisma.$transaction(async (tx) => {
        const project = await tx.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            stripeConnectId: stripeAccountId,
            // stripeMode always defaults to "live", so clear it explicitly on disconnect
            stripeConnectMode: stripeAccountId ? stripeMode : null,
          },
          select: {
            stripeConnectId: true,
          },
        });

        // Uninstall the integration if the stripe account id is null
        if (stripeAccountId === null) {
          await tx.installedIntegration.delete({
            where: {
              id: installation.id,
            },
          });
        }

        return project;
      });

      return NextResponse.json(response, {
        headers: CORS_HEADERS,
      });
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: `The Stripe account "${stripeAccountId}" is already connected to another workspace in "${stripeMode}" mode.`,
        });
      }

      throw new DubApiError({
        code: "internal_server_error",
        message: error.message,
      });
    }
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
