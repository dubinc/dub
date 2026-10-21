import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { getNormalizedEmail } from "@/lib/email/normalize-email";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  getOwnedAssetKey,
  resolveIncomingImage,
} from "@/lib/storage/asset-keys";
import {
  CustomerEnrichedSchema,
  CustomerSchema,
  getCustomersQuerySchema,
  updateCustomerBodySchema,
} from "@/lib/zod/schemas/customers";
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
    requiredPermissions: ["customers.read"],
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);

// PATCH /api/customers/:id – Update a customer by ID
export const PATCH = withWorkspace(
  async ({ workspace, params, req, searchParams }) => {
    const { id } = params;
    const { includeExpandedFields } =
      getCustomersQuerySchema.parse(searchParams);

    const {
      name,
      email,
      avatar,
      externalId,
      stripeCustomerId,
      country,
      subscriptionCanceledAt,
    } = updateCustomerBodySchema.parse(await parseRequestBody(req));

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

    const { url: finalCustomerAvatar, uploadKey: avatarUploadKey } =
      resolveIncomingImage({
        kind: "customerAvatar",
        ownerId: customer.id,
        value: avatar,
        current: oldCustomerAvatar,
      });

    try {
      const updatedCustomer = await prisma.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          name,
          email,
          ...(email !== undefined && {
            normalizedEmail: getNormalizedEmail(email),
          }),
          avatar: finalCustomerAvatar,
          externalId,
          stripeCustomerId,
          country,
          subscriptionCanceledAt,
        },
      });

      if (avatar && avatarUploadKey) {
        waitUntil(
          storage
            .upload({
              key: avatarUploadKey,
              body: avatar,
              opts: {
                width: 128,
                height: 128,
              },
            })
            .then(() => {
              const oldAvatarKey = getOwnedAssetKey({
                kind: "customerAvatar",
                ownerId: customer.id,
                url: oldCustomerAvatar,
              });

              if (oldAvatarKey) {
                storage.delete({
                  key: oldAvatarKey,
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
    requiredPermissions: ["customers.write"],
    requiredPlan: ["business", "advanced", "enterprise"],
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

    const avatarKey = getOwnedAssetKey({
      kind: "customerAvatar",
      ownerId: customer.id,
      url: customer.avatar,
    });

    if (avatarKey) {
      storage.delete({
        key: avatarKey,
      });
    }

    return NextResponse.json({
      id: customer.id,
    });
  },
  {
    requiredPermissions: ["customers.write"],
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
