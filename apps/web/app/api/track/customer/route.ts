import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { generateRandomName } from "@/lib/names";
import { prismaEdge } from "@/lib/prisma/edge";
import {
  trackCustomerRequestSchema,
  trackCustomerResponseSchema,
} from "@/lib/zod/schemas/customers";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/customer – Track a customer object
export const POST = withWorkspaceEdge(
  async ({ req, workspace }) => {
    const {
      customerId: externalId,
      customerName,
      customerEmail,
      customerAvatar,
    } = trackCustomerRequestSchema.parse(await parseRequestBody(req));

    const finalCustomerName =
      customerName || customerEmail || generateRandomName();

    const customer = await prismaEdge.customer.upsert({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId,
        },
      },
      create: {
        name: finalCustomerName,
        email: customerEmail,
        avatar: customerAvatar,
        externalId,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
      },
      update: {
        name: finalCustomerName,
        email: customerEmail,
        avatar: customerAvatar,
      },
    });

    const response = trackCustomerResponseSchema.parse({
      customerId: customer.externalId,
      customerName: customer.name,
      customerEmail: customer.email,
      customerAvatar: customer.avatar,
    });

    return NextResponse.json(response);
  },
  {
    requiredAddOn: "conversion",
    requiredPermissions: ["conversions.write"],
  },
);
