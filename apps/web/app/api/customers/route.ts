import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { generateRandomName } from "@/lib/names";
import {
  createCustomerBodySchema,
  CustomerSchema,
  getCustomersQuerySchema,
} from "@/lib/zod/schemas/customers";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/customers – Get all customers
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { email, externalId } = getCustomersQuerySchema.parse(searchParams);

    const customers = await prisma.customer.findMany({
      where: {
        projectId: workspace.id,
        ...(email ? { email } : {}),
        ...(externalId ? { externalId } : {}),
      },
      take: 100,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        link: {
          include: {
            programEnrollment: {
              include: {
                partner: true,
                discount: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      CustomerSchema.array().parse(customers.map(transformCustomer)),
    );
  },
  {
    requiredAddOn: "conversion",
  },
);

// POST /api/customers – Create a new customer
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { email, name, avatar, externalId } = createCustomerBodySchema.parse(
      await parseRequestBody(req),
    );

    const finalCustomerName = name || email || generateRandomName();

    try {
      const customer = await prisma.customer.create({
        data: {
          name: finalCustomerName,
          email,
          avatar,
          externalId,
          projectId: workspace.id,
          projectConnectId: workspace.stripeConnectId,
        },
      });

      return NextResponse.json(
        CustomerSchema.parse(transformCustomer(customer)),
        {
          status: 201,
        },
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
    requiredAddOn: "conversion",
  },
);
