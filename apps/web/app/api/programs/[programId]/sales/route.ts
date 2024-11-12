import { INTERVAL_DATA } from "@/lib/analytics/constants";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CustomerSchema,
  getSalesQuerySchema,
  PartnerSchema,
  SaleSchema,
} from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";
import { z } from "zod";

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

    let { interval, start, end } = parsed;
    let granularity: "minute" | "hour" | "day" | "month" = "day";

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    validDateRangeForPlan({
      plan: workspace.plan,
      interval,
      start,
      end,
      throwError: true,
    });

    if (start) {
      start = new Date(start);
      end = end ? new Date(end) : new Date(Date.now());

      // Swap start and end if start is greater than end
      if (start > end) {
        [start, end] = [end, start];
      }
    } else {
      interval = interval ?? "24h";
      start = INTERVAL_DATA[interval].startDate;
      end = new Date(Date.now());
    }

    const sales = await prisma.sale.findMany({
      where: {
        programId,
        ...(status && { status }),
        ...(customerId && { customerId }),
        ...(payoutId && { payoutId }),
        ...(partnerId && { partnerId }),
        // createdAt: {
        //   gte: new Date(start).toISOString(),
        //   lte: new Date(end).toISOString(),
        // },
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

    return NextResponse.json(z.array(responseSchema).parse(sales));
  },
);
