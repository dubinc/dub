import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { generateRandomName } from "@/lib/names";
import { prismaEdge } from "@/lib/prisma/edge";
import { recordCustomer } from "@/lib/tinybird";
import {
  trackCustomerRequestSchema,
  trackCustomerResponseSchema,
} from "@/lib/zod/schemas/customers";
import { waitUntil } from "@vercel/functions";
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

    const customer = await prismaEdge.customer.upsert({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId,
        },
      },
      create: {
        name: customerName || generateRandomName(),
        email: customerEmail,
        avatar: customerAvatar,
        externalId,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
      },
      update: {
        name: customerName,
        email: customerEmail,
        avatar: customerAvatar,
      },
    });

    waitUntil(
      recordCustomer({
        workspace_id: workspace.id,
        customer_id: customer.id,
        name: customer.name || "",
        email: customer.email || "",
        avatar: customer.avatar || "",
      }),
    );

    const response = trackCustomerResponseSchema.parse({
      customerId: externalId,
      customerName: customer.name,
      customerEmail: customer.email,
      customerAvatar: customer.avatar,
    });

    return NextResponse.json(response);
  },
  {
    featureFlag: "conversions",
    requiredPermissions: ["conversions.write"],
  },
);
