import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { prismaEdge } from "@/lib/prisma/edge";
import { recordCustomer } from "@/lib/tinybird";
import {
  trackCustomerRequestSchema,
  trackCustomerResponsetSchema,
} from "@/lib/zod/schemas/customers";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/customer – Track a customer object
export const POST = withWorkspaceEdge(
  async ({ req, workspace }) => {
    const {
      customerName,
      customerEmail,
      customerAvatar,
      customerId: externalId,
    } = trackCustomerRequestSchema.parse(await parseRequestBody(req));

    // Find customer
    const existingCustomer = await prismaEdge.customer.findUnique({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId,
        },
      },
    });

    if (existingCustomer) {
      throw new DubApiError({
        code: "conflict",
        message: `A customer with customerId: ${externalId} already exists`,
      });
    }

    // Create a new customer
    const customer = await prismaEdge.customer.create({
      data: {
        id: nanoid(16),
        name: customerName, // TODO: Generate random name if not provided
        email: customerEmail,
        avatar: customerAvatar,
        externalId,
        projectId: workspace.id,
        projectConnectId: "", // TODO: This can be null
      },
    });

    // Record customer
    await recordCustomer({
      workspace_id: workspace.id,
      customer_id: customer.id,
      name: customerName || "",
      email: customerEmail || "",
      avatar: customerAvatar || "",
    });

    const response = trackCustomerResponsetSchema.parse({
      customerId: externalId,
      customerName,
      customerEmail,
      customerAvatar,
    });

    return NextResponse.json(response, { status: 201 });
  },
  { betaFeature: true },
);
