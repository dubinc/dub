import { createId } from "@/lib/api/create-id";
import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { generateRandomName } from "@/lib/names";
import { isStored, storage } from "@/lib/storage";
import {
  createCustomerBodySchema,
  CustomerEnrichedSchema,
  CustomerSchema,
  getCustomersQuerySchemaExtended,
} from "@/lib/zod/schemas/customers";
import { DiscountSchemaWithDeprecatedFields } from "@/lib/zod/schemas/discount";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import {
  Customer,
  Discount,
  Link,
  Partner,
  Program,
  ProgramEnrollment,
} from "@dub/prisma/client";
import { nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

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
            : search
              ? search.includes("@")
                ? { email: search }
                : {
                    email: { search: sanitizeFullTextSearch(search) },
                    name: { search: sanitizeFullTextSearch(search) },
                  }
              : {}),
        ...(country && {
          country,
        }),
        ...(linkId && {
          linkId,
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
    const { email, name, avatar, externalId, stripeCustomerId, country } =
      createCustomerBodySchema.parse(await parseRequestBody(req));

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
          stripeCustomerId,
          country,
          projectId: workspace.id,
          projectConnectId: workspace.stripeConnectId,
        },
      });

      if (avatar && !isStored(avatar) && finalCustomerAvatar) {
        waitUntil(
          storage
            .upload({
              key: finalCustomerAvatar.replace(`${R2_URL}/`, ""),
              body: avatar,
              opts: {
                width: 128,
                height: 128,
              },
            })
            .catch(async (error) => {
              console.error("Error persisting customer avatar to R2", error);
              // if the avatar fails to upload to R2, set the avatar to null in the database
              await prisma.customer.update({
                where: {
                  id: customer.id,
                },
                data: {
                  avatar: null,
                },
              });
            }),
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
