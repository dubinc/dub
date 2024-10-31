import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CustomerSchema, PartnerSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";
import { z } from "zod";

const searchSchema = z.object({
  offset: z.number().optional().default(0),
  limit: z.number().optional().default(50),
});

const responseSchema = CustomerSchema.and(
  z.object({
    partner: PartnerSchema,
  }),
);

// GET /api/programs/[programId]/customers - get all customers for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;
    const { offset, limit } = searchSchema.parse(searchParams);

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
      skip: offset,
      take: limit,
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
