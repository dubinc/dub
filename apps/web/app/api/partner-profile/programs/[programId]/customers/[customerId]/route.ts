import { determineCustomerDiscount } from "@/lib/api/customers/determine-customer-discount";
import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { withPartnerProfile } from "@/lib/auth/partner";
import { generateRandomName } from "@/lib/names";
import {
  CustomerEnrichedSchema,
  CustomerSchema,
  getCustomersQuerySchema,
  updateCustomerBodySchema,
} from "@/lib/zod/schemas/customers";
import { PartnerProfileCustomerSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { Discount } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/:programId/customers/:customerId – Get a customer by ID
export const GET = withPartnerProfile(
  async ({ partner, params }) => {
    const { customerId, programId } = params;

    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: programId,
    });

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      include: {
        link: {
          include: {
            programEnrollment: {
              include: {
                partner: true,
                program: true,
              },
            },
          },
        },
      },
    });

    if (
      !customer ||
      ![
        customer?.link?.programEnrollment?.programId,
        customer?.link?.programEnrollment?.program.slug,
      ].includes(program.id)
    ) {
      throw new DubApiError({
        code: "not_found",
        message:
          "Customer not found. Make sure you're using the correct customer ID (e.g. `cus_3TagGjzRzmsFJdH8od2BNCsc`).",
      });
    }

    customer.avatar = null;
    customer.email;

    return NextResponse.json(
      PartnerProfileCustomerSchema.parse(
        transformCustomer({
          ...customer,
          email: customer.email || customer.name || generateRandomName(),
          link: customer.link
            ? {
                ...customer.link,
                programEnrollment: customer.link.programEnrollment
                  ? { ...customer.link.programEnrollment, program: undefined }
                  : null,
              }
            : null,
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
