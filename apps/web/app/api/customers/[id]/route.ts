import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CustomerSchema,
  updateCustomerBodySchema,
} from "@/lib/zod/schemas/customers";
import { NextResponse } from "next/server";

// GET /api/customers/:id – Get a customer by ID
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { id } = params;

    const customer = await getCustomerOrThrow({
      id,
      workspaceId: workspace.id,
    });

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
      });

      return NextResponse.json(CustomerSchema.parse(customer));
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: "A customer with this external ID already exists.",
        });
      } else if (error.code === "P2025") {
        throw new DubApiError({
          code: "not_found",
          message:
            "Customer not found. Make sure you're using the correct external ID.",
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

    try {
      await prisma.customer.delete({
        where: {
          id,
        },
      });

      return NextResponse.json({
        id,
      });
    } catch (error) {
      if (error.code === "P2025") {
        throw new DubApiError({
          code: "not_found",
          message: "Customer not found",
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
