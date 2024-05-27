import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { generateRandomName } from "@/lib/names";
import { prismaEdge } from "@/lib/prisma/edge";
import { recordCustomer } from "@/lib/tinybird";
import {
  trackCustomerRequestSchema,
  trackCustomerResponseSchema,
} from "@/lib/zod/schemas/customers";
import { nanoid } from "@dub/utils";
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

    const randomId = `cus_${nanoid(16)}`;
    const randomName = generateRandomName();

    try {
      const customer = await prismaEdge.customer.upsert({
        where: {
          projectId_externalId: {
            projectId: workspace.id,
            externalId,
          },
        },
        create: {
          id: randomId,
          name: customerName || randomName,
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

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: `A customer with customerId: ${externalId} already exists`,
        });
      }

      throw new DubApiError({
        code: "internal_server_error",
        message: "Failed to create customer",
      });
    }
  },
  { betaFeature: true },
);
