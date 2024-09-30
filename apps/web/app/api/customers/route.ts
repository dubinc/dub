import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { generateRandomName } from "@/lib/names";
import { prisma } from "@/lib/prisma";
import {
  createCustomerBodySchema,
  CustomerSchema,
} from "@/lib/zod/schemas/customers";
import { NextResponse } from "next/server";

// GET /api/customers – Get all customers
export const GET = withWorkspace(
  async ({ workspace }) => {
    const customers = await prisma.customer.findMany({
      where: {
        projectId: workspace.id,
      },
      take: 100,
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(CustomerSchema.array().parse(customers));
  },
  {
    requiredAddOn: "conversion",
  },
);

// POST /api/customers – Create a new customer
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { id, email, name, avatar } = createCustomerBodySchema.parse(
      await parseRequestBody(req),
    );

    const finalCustomerName = name || email || generateRandomName();

    try {
      const customer = await prisma.customer.create({
        data: {
          name: finalCustomerName,
          email,
          avatar,
          externalId: id,
          projectId: workspace.id,
          projectConnectId: workspace.stripeConnectId,
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
