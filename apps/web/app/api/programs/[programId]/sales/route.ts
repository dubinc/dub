import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getSalesQuerySchema,
  getSalesResponseSchema,
} from "@/lib/zod/schemas/partners";
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
      order,
      sortBy,
      customerId,
      payoutId,
      partnerId,
    } = parsed;

    const { startDate, endDate } = getStartEndDates(parsed);

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const sales = await prisma.sale.findMany({
      where: {
        programId,
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
      orderBy: { [sortBy]: order },
    });

    return NextResponse.json(z.array(getSalesResponseSchema).parse(sales));
  },
);
