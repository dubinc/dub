import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaginationQuerySchema } from "@/lib/zod/schemas/misc";
import {
  CustomerSchema,
  PartnerSchema,
  SaleSchema,
} from "@/lib/zod/schemas/partners";
import { SaleStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

export const salesQuerySchema = z
  .object({
    status: z.nativeEnum(SaleStatus).optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    sortBy: z.enum(["createdAt", "amount"]).default("createdAt"),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

const responseSchema = SaleSchema.and(
  z.object({
    customer: CustomerSchema,
    partner: PartnerSchema,
  }),
);

// GET /api/programs/[programId]/sales - get all sales for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;
    const { page, pageSize, status, order, sortBy } =
      salesQuerySchema.parse(searchParams);

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const sales = await prisma.sale.findMany({
      where: {
        programId,
        ...(status && { status }),
      },
      select: {
        id: true,
        amount: true,
        commissionEarned: true,
        currency: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        customer: true,
        partner: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: order },
    });

    return NextResponse.json(z.array(responseSchema).parse(sales));
  },
);
