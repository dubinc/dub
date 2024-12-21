import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  CustomerSchema,
  updateCustomerBodySchema,
} from "@/lib/zod/schemas/customers";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/customers/:id – Get a customer by ID
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { id } = params;

    const customer = await getCustomerOrThrow(
      {
        id,
        workspaceId: workspace.id,
      },
      {
        expand: ["link"],
      },
    );

    return NextResponse.json(CustomerSchema.parse(customer));
  },
  {
    requiredAddOn: "conversion",
  },
);

// PATCH /api/customers/:id – Update a customer by ID
export const PATCH = withWorkspace(
  async ({ workspace, params, req }) => {
    const { id } = params;

    const { name, email, avatar, externalId } = updateCustomerBodySchema.parse(
      await parseRequestBody(req),
    );

    await getCustomerOrThrow({
      id,
      workspaceId: workspace.id,
    });

    try {
      const customer = await prisma.customer.update({
        where: {
          id,
        },
        data: { name, email, avatar, externalId },
        include: {
          link: true,
        },
      });

      return NextResponse.json(CustomerSchema.parse(customer));
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: "A customer with this external ID already exists.",
        });
      }

      throw new DubApiError({
        code: "unprocessable_entity",
        message: error.message,
      });
    }
  },
  {
    requiredAddOn: "conversion",
  },
);

// DELETE /api/customers/:id – Delete a customer by ID
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const { id } = params;

    await getCustomerOrThrow({
      id,
      workspaceId: workspace.id,
    });

    await prisma.customer.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      id,
    });
  },
  {
    requiredAddOn: "conversion",
  },
);
