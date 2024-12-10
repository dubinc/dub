import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartner } from "@/lib/auth/partner";
import z from "@/lib/zod";
import {
  getPartnerSalesQuerySchema,
  PartnerSaleResponseSchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/programs/[programId]/sales – get sales for a partner in a program enrollment
export const GET = withPartner(async ({ partner, params, searchParams }) => {
  const { program } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
  });

  const parsed = getPartnerSalesQuerySchema.parse(searchParams);
  const { page, pageSize, status, order, sortBy, customerId, payoutId } =
    parsed;

  const { startDate, endDate } = getStartEndDates(parsed);

  const sales = await prisma.sale.findMany({
    where: {
      programId: program.id,
      partnerId: partner.id,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(payoutId && { payoutId }),
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
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { [sortBy]: order },
  });

  return NextResponse.json(z.array(PartnerSaleResponseSchema).parse(sales));
});
