import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CustomerSchema,
  updateCustomerBodySchema,
} from "@/lib/zod/schemas/customers";
import { NextResponse } from "next/server";

// GET /api/customers/:id – Get a customer by external ID
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { id: externalId } = params;
  const customer = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: workspace.id,
        externalId,
      },
    },
  });
  if (!customer) {
    throw new DubApiError({
      code: "not_found",
      message: "Customer not found",
    });
  }

  return NextResponse.json(
    CustomerSchema.parse({
      ...customer,
      id: customer.externalId,
    }),
  );
});

// PATCH /api/customers/:id – Update a customer by external ID
export const PATCH = withWorkspace(async ({ workspace, params, req }) => {
  const { id: externalId } = params;
  const {
    id: newExternalId,
    name,
    email,
    avatar,
  } = updateCustomerBodySchema.parse(await parseRequestBody(req));

  try {
    const customer = await prisma.customer.update({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId,
        },
      },
      data: { name, email, avatar, externalId: newExternalId },
    });

    return NextResponse.json(
      CustomerSchema.parse({
        ...customer,
        id: customer.externalId,
      }),
    );
  } catch (error) {
    if (error.code === "P2002") {
      throw new DubApiError({
        code: "conflict",
        message: "A customer with this external ID already exists.",
      });
    } else if (error.code === "P2025") {
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
});

// DELETE /api/customers/:id – Delete a customer by external ID
export const DELETE = withWorkspace(async ({ workspace, params }) => {
  const { id: externalId } = params;
  try {
    const customer = await prisma.customer.delete({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId,
        },
      },
    });

    return NextResponse.json({
      id: customer.externalId,
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
});
