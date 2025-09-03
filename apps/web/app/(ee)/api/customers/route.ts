import { createId } from "@/lib/api/create-id";
import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { generateRandomName } from "@/lib/names";
import { isStored, storage } from "@/lib/storage";
import z from "@/lib/zod";
import {
  createCustomerBodySchema,
  CustomerEnrichedSchema,
  CustomerSchema,
  getCustomersQuerySchemaExtended,
} from "@/lib/zod/schemas/customers";
import { DiscountSchemaWithDeprecatedFields } from "@/lib/zod/schemas/discount";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import {
  Customer,
  Discount,
  Link,
  Partner,
  Program,
  ProgramEnrollment,
} from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

interface CustomerResponse extends Customer {
  link: Link & {
    programEnrollment: ProgramEnrollment & {
      program: Program;
      partner: Partner;
      discount: Discount | null;
    };
  };
}

// GET /api/customers – Get all customers
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const {
      email,
      externalId,
      search,
      country,
      linkId,
      includeExpandedFields,
      page,
      pageSize,
      customerIds,
      sortBy,
      sortOrder,
    } = getCustomersQuerySchemaExtended.parse(searchParams);

    const customers = (await prisma.customer.findMany({
      where: {
        ...(customerIds
          ? {
              id: { in: customerIds },
            }
          : {}),
        projectId: workspace.id,
        ...(email
          ? { email }
          : externalId
            ? { externalId }
            : {
                ...(search && {
                  OR: [
                    { email: { startsWith: search } },
                    { externalId: { startsWith: search } },
                    { name: { startsWith: search } },
                  ],
                }),
                ...(country && {
                  country,
                }),
                ...(linkId && {
                  linkId,
                }),
              }),
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      ...(includeExpandedFields
        ? {
            include: {
              link: {
                include: {
                  programEnrollment: {
                    include: {
                      partner: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                          image: true,
                        },
                      },
                      discount: true,
                    },
                  },
                },
              },
            },
          }
        : {}),
    })) as CustomerResponse[];

    const responseSchema = includeExpandedFields
      ? CustomerEnrichedSchema.merge(
          z.object({
            discount: DiscountSchemaWithDeprecatedFields,
          }),
        )
      : CustomerSchema;

    const response = responseSchema
      .array()
      .parse(customers.map(transformCustomer));

    return NextResponse.json(response);
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

// POST /api/customers – Create a customer
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { email, name, avatar, externalId } = createCustomerBodySchema.parse(
      await parseRequestBody(req),
    );

    const customerId = createId({ prefix: "cus_" });
    const finalCustomerName = name || email || generateRandomName();
    const finalCustomerAvatar =
      avatar && !isStored(avatar)
        ? `${R2_URL}/customers/${customerId}/avatar_${nanoid(7)}`
        : avatar;

    try {
      const customer = await prisma.customer.create({
        data: {
          id: customerId,
          name: finalCustomerName,
          email,
          avatar: finalCustomerAvatar,
          externalId,
          projectId: workspace.id,
          projectConnectId: workspace.stripeConnectId,
        },
      });

      if (avatar && !isStored(avatar) && finalCustomerAvatar) {
        waitUntil(
          storage.upload(
            finalCustomerAvatar.replace(`${R2_URL}/`, ""),
            avatar,
            {
              width: 128,
              height: 128,
            },
          ),
        );
      }

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
      "advanced",
      "enterprise",
    ],
  },
);
