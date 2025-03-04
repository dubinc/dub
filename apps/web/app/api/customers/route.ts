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
import {
  Customer,
  Discount,
  Link,
  Partner,
  Program,
  ProgramEnrollment,
} from "@prisma/client";
import { differenceInMonths } from "date-fns";
import { NextResponse } from "next/server";

interface CustomerResponse extends Customer {
  link: Link & {
    programEnrollment: ProgramEnrollment & {
      program: Program & {
        defaultDiscount: Discount;
      };
      partner: Partner;
      discount: Discount | null;
    };
  };
}

// GET /api/customers – Get all customers
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { email, externalId, includeExpandedFields } =
      getCustomersQuerySchema.parse(searchParams);

    const customers = (await prisma.customer.findMany({
      where: {
        projectId: workspace.id,
        ...(email ? { email } : {}),
        ...(externalId ? { externalId } : {}),
      },
      take: 100,
      orderBy: {
        createdAt: "desc",
      },
      ...(includeExpandedFields
        ? {
            include: {
              link: {
                include: {
                  programEnrollment: {
                    include: {
                      program: {
                        include: {
                          defaultDiscount: true,
                        },
                      },
                      partner: true,
                      discount: true,
                    },
                  },
                },
              },
            },
          }
        : {}),
    })) as CustomerResponse[];

    // TODO
    // Move this to another methods
    const determineCustomerDiscount = async (customer: CustomerResponse) => {
      const discount =
        customer.link?.programEnrollment?.discount ||
        customer.link?.programEnrollment?.program.defaultDiscount ||
        null;

      if (!discount) {
        return null;
      }

      // Lifetime discount
      if (discount.maxDuration === null) {
        return discount;
      }

      const firstPurchase = await prisma.commission.findFirst({
        where: {
          customerId: customer.id,
          type: "sale",
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      // No purchase yet so we can apply the discount
      if (!firstPurchase) {
        return discount;
      }

      const monthsDifference = differenceInMonths(
        new Date(),
        firstPurchase.createdAt,
      );

      return monthsDifference < discount.maxDuration ? discount : null;
    };

    const processedCustomers = await Promise.all(
      customers.map(async (customer) => {
        return {
          ...customer,
          discount: await determineCustomerDiscount(customer),
        };
      }),
    );

    return NextResponse.json(
      CustomerSchema.array().parse(processedCustomers.map(transformCustomer)),
    );
    P;
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "enterprise",
    ],
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
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "enterprise",
    ],
  },
);
