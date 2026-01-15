import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { isStored, storage } from "@/lib/storage";
import {
  CustomerEnrichedSchema,
  CustomerSchema,
  getCustomersQuerySchema,
  updateCustomerBodySchema,
} from "@/lib/zod/schemas/customers";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
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

    const responseSchema = includeExpandedFields
      ? CustomerEnrichedSchema
      : CustomerSchema;

    return NextResponse.json(responseSchema.parse(transformCustomer(customer)));
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

    const oldCustomerAvatar = customer.avatar;

    // we need to persist the customer avatar to R2 if:
    // 1. it's different from the old avatar
    // 2. it's not stored in R2 already
    const finalCustomerAvatar =
      avatar && avatar !== oldCustomerAvatar && !isStored(avatar)
        ? `${R2_URL}/customers/${customer.id}/avatar_${nanoid(7)}`
        : avatar;

    try {
      const updatedCustomer = await prisma.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          name,
          email,
          avatar: finalCustomerAvatar,
          externalId,
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
            .then(() => {
              if (oldCustomerAvatar && isStored(oldCustomerAvatar)) {
                storage.delete({
                  key: oldCustomerAvatar.replace(`${R2_URL}/`, ""),
                });
              }
            })
            .catch(async (error) => {
              console.error("Error persisting customer avatar to R2", error);
              // if the avatar fails to upload to R2, set the avatar to null in the database
              await prisma.customer.update({
                where: { id: customer.id },
                data: { avatar: null },
              });
            }),
        );
      }

      const responseSchema = includeExpandedFields
        ? CustomerEnrichedSchema
        : CustomerSchema;

      return NextResponse.json(
        responseSchema.parse(
          transformCustomer({
            ...customer,
            ...updatedCustomer,
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
    requiredRoles: ["owner", "member"],
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

    if (customer.avatar && isStored(customer.avatar)) {
      storage.delete({ key: customer.avatar.replace(`${R2_URL}/`, "") });
    }

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
    requiredRoles: ["owner", "member"],
  },
);
