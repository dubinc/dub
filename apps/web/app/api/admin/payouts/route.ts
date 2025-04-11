import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { withAdmin } from "@/lib/auth";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { prisma } from "@dub/prisma";
import { ACME_WORKSPACE_ID } from "@dub/utils";
import { NextResponse } from "next/server";

export const GET = withAdmin(async ({ searchParams }) => {
  const { interval = "mtd", start, end } = searchParams;

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
  });

  // Fetch invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      workspaceId: {
        not: ACME_WORKSPACE_ID,
      },
      status: "completed",
      paidAt: {
        not: null,
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      paidAt: "desc",
    },
  });

  // log total fees
  console.log(invoices.reduce((acc, invoice) => acc + invoice.fee, 0));

  const { dateFormat } = sqlGranularityMap[granularity];

  // Calculate timeseries data for payouts and fees
  const timeseriesData = await prisma.$queryRaw<
    { date: Date; payouts: number; fees: number }[]
  >`
    SELECT 
      DATE_FORMAT(paidAt, ${dateFormat}) as date,
      SUM(amount) as payouts,
      SUM(fee) as fees
    FROM Invoice
    WHERE 
      workspaceId != ${ACME_WORKSPACE_ID}
      AND status = 'completed'
      AND paidAt IS NOT NULL
      AND paidAt >= ${startDate}
      AND paidAt <= ${endDate}
    GROUP BY DATE_FORMAT(paidAt, ${dateFormat})
    ORDER BY date ASC;
  `;

  const formattedInvoices = invoices.map((invoice) => ({
    date: invoice.paidAt!,
    number: invoice.number,
    status: invoice.status,
    amount: invoice.amount,
    fee: invoice.fee,
    total: invoice.total,
  }));

  const formattedTimeseriesData = timeseriesData.map((point) => ({
    date: new Date(point.date),
    payouts: Number(point.payouts),
    fees: Number(point.fees),
  }));

  return NextResponse.json({
    invoices: formattedInvoices,
    timeseriesData: formattedTimeseriesData,
  });
});
