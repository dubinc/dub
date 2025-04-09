import { determineCustomerDiscount } from "@/lib/api/customers/determine-customer-discount";
import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  CustomerEnrichedSchema,
  CustomerSchema,
  getCustomersQuerySchema,
  updateCustomerBodySchema,
} from "@/lib/zod/schemas/customers";
import { prisma } from "@dub/prisma";
import { Discount } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/customers/:id – Get a customer by ID
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { id } = params;
    const { includeExpandedFields } =
      getCustomersQuerySchema.parse(searchParams);

    const customer = await getCustomerOrThrow(
      {
        id,
        workspaceId: workspace.id,
      },
      {
        includeExpandedFields,
      },
    );

    let discount: Discount | null = null;

    if (includeExpandedFields) {
      const firstPurchase = await prisma.commission.findFirst({
        where: {
          customerId: customer.id,
          type: "sale",
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          createdAt: true,
        },
      });

      discount = determineCustomerDiscount({
        customerLink: customer.link,
        firstPurchase,
      });
    }

    const responseSchema = includeExpandedFields
      ? CustomerEnrichedSchema
      : CustomerSchema;

    return NextResponse.json(
      responseSchema.parse(
        transformCustomer({
          ...customer,
          ...(includeExpandedFields ? { discount } : {}),
        }),
      ),
    );
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
  },
);

// PATCH /api/customers/:id – Update a customer by ID
export const PATCH = withWorkspace(
  async ({ workspace, params, req, searchParams }) => {
    const { id } = params;
    const { includeExpandedFields } =
      getCustomersQuerySchema.parse(searchParams);

    const { name, email, avatar, externalId } = updateCustomerBodySchema.parse(
      await parseRequestBody(req),
    );

    const customer = await getCustomerOrThrow(
      {
        id,
        workspaceId: workspace.id,
      },
      {
        includeExpandedFields,
      },
    );

    try {
      const updatedCustomer = await prisma.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          name,
          email,
          avatar,
          externalId,
        },
      });

      let discount: Discount | null = null;

      if (includeExpandedFields) {
        const firstPurchase = await prisma.commission.findFirst({
          where: {
            customerId: customer.id,
            type: "sale",
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            createdAt: true,
          },
        });

        discount = determineCustomerDiscount({
          customerLink: customer.link,
          firstPurchase,
        });
      }

      const responseSchema = includeExpandedFields
        ? CustomerEnrichedSchema
        : CustomerSchema;

      return NextResponse.json(
        responseSchema.parse(
          transformCustomer({
            ...customer,
            ...updatedCustomer,
            ...(includeExpandedFields ? { discount } : {}),
          }),
        ),
      );
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

// DELETE /api/customers/:id – Delete a customer by ID
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const { id } = params;

    const customer = await getCustomerOrThrow({
      id,
      workspaceId: workspace.id,
    });

    await prisma.customer.delete({
      where: {
        id: customer.id,
      },
    });

    return NextResponse.json({
      id: customer.id,
    });
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
  },
);
