import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import {
  CustomerSchema,
  customersQuerySchema,
} from "@/lib/zod/schemas/customers";
import { PartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const responseSchema = CustomerSchema.and(
  z.object({
    partner: PartnerSchema,
  }),
);

// GET /api/programs/[programId]/customers - get all customers for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;
    const { search, ids, page, pageSize } =
      customersQuerySchema.parse(searchParams);

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const customers = await prisma.customer.findMany({
      where: {
        sales: {
          some: {
            programId,
          },
        },
        ...(search && { name: { contains: search } }),
        ...(ids && { id: { in: ids } }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        externalId: true,
        createdAt: true,
        updatedAt: true,
        sales: {
          select: {
            partner: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const customersWithPartner = customers.map((customer) => {
      return responseSchema.parse({
        ...customer,
        partner: customer.sales[0]?.partner,
      });
    });

    return NextResponse.json(customersWithPartner);
  },
);
