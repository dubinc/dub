import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { getPaginationQuerySchema } from "@/lib/zod/schemas/misc";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { InvoiceStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { getPayoutsTimeseries } from "./get-payouts-timeseries";

const adminPayoutsQuerySchema = z
  .object({
    programId: z.string().optional(),
    status: z.enum(InvoiceStatus).optional(),
  })
  .extend(
    analyticsQuerySchema.pick({ interval: true, start: true, end: true }).shape,
  )
  .extend(getPaginationQuerySchema({ pageSize: 100 }));

export const GET = withAdmin(async ({ searchParams }) => {
  const {
    programId,
    status,
    interval = "mtd",
    start,
    end,
    page,
    pageSize,
  } = adminPayoutsQuerySchema.parse(searchParams);

  const timezone = "UTC";
  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
    dataAvailableFrom: new Date("2024-11-01"),
  });

  const invoiceWhere: Prisma.InvoiceWhereInput = {
    ...(programId
      ? { programId }
      : {
          AND: [
            {
              programId: {
                not: ACME_PROGRAM_ID,
              },
            },
            {
              program: {
                isNot: null,
              },
            },
          ],
        }),
    status: status || {
      not: "failed",
    },
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  const [invoices, totalInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: invoiceWhere,
      include: {
        program: {
          select: {
            name: true,
            logo: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: ((page ?? 1) - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({
      where: invoiceWhere,
    }),
  ]);

  const timeseriesData = await getPayoutsTimeseries({
    programId,
    status,
    startDate,
    endDate,
    granularity,
    timezone,
  });

  const formattedInvoices = invoices.map((invoice) => ({
    date: invoice.createdAt,
    // we're coercing this cause we've filtered out invoices without a programId above
    programId: invoice.programId!,
    programName: invoice.program!.name,
    programLogo: invoice.program!.logo,
    status: invoice.status,
    amount: invoice.amount,
    fee: invoice.fee,
    total: invoice.total,
  }));

  return NextResponse.json({
    invoices: formattedInvoices,
    timeseriesData,
    totalInvoices,
  });
});
