import { createId } from "@/lib/api/create-id";
import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
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
import { nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/customers – Get all customers
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    let {
      email,
      externalId,
      search,
      country,
      linkId,
      programId,
      partnerId,
      includeExpandedFields,
      page,
      pageSize,
      customerIds,
      sortBy,
      sortOrder,
    } = getCustomersQuerySchemaExtended.parse(searchParams);

    if (programId || partnerId) {
      programId = getDefaultProgramIdOrThrow(workspace);
    }

    const customers = await prisma.customer.findMany({
      where: {
        ...(customerIds
          ? {
              id: { in: customerIds },
            }
          : {}),
        ...(programId && {
          programId,
        }),
        ...(partnerId && {
          partnerId,
        }),
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
                select: {
                  id: true,
                  domain: true,
                  key: true,
                  shortLink: true,
                  url: true,
                  programId: true,
                },
              },
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
          }
        : {}),
    });

    const responseSchema = includeExpandedFields
      ? CustomerEnrichedSchema.extend({
          discount: DiscountSchemaWithDeprecatedFields,
        })
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
    requiredRoles: ["owner", "member"],
  },
);
