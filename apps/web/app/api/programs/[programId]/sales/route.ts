import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  getSalesQuerySchema,
  SaleResponseSchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/programs/[programId]/sales - get all sales for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;
    const parsed = getSalesQuerySchema.parse(searchParams);
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
        ...(status && { status }),
        ...(customerId && { customerId }),
        ...(payoutId && { payoutId }),
        ...(partnerId && { partnerId }),
        createdAt: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
      select: {
        id: true,
        amount: true,
        earnings: true,
        currency: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        customer: true,
        partner: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    });

    return NextResponse.json(z.array(SaleResponseSchema).parse(sales));
  },
);
