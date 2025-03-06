import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  getProgramSalesQuerySchema,
  ProgramSaleResponseSchema,
} from "@/lib/zod/schemas/program-sales";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/programs/[programId]/sales - get all sales for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;
    const parsed = getProgramSalesQuerySchema.parse(searchParams);
    const {
      page,
      pageSize,
      status,
      sortBy,
      sortOrder,
      customerId,
      payoutId,
      partnerId,
    } = parsed;

    const { startDate, endDate } = getStartEndDates(parsed);

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const sales = await prisma.commission.findMany({
      where: {
        programId,
        type: "sale",
        status,
        customerId,
        payoutId,
        partnerId,
        createdAt: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
      include: {
        customer: true,
        partner: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    });

    return NextResponse.json(z.array(ProgramSaleResponseSchema).parse(sales));
  },
);
