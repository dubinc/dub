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

      return NextResponse.json(
        CustomerSchema.parse({ ...customer, id: customer.externalId }),
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
    requiredPermissions: ["conversions.write"],
  },
);
