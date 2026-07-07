import { getAnalytics } from "@/lib/analytics/get-analytics";
import { prisma } from "@/lib/prisma";
import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";

export async function recomputeWorkspaceUsage({
  workspaceId,
  billingStart,
  billingEnd = new Date(),
  dataAvailableFrom,
}: {
  workspaceId: string;
  billingStart: Date;
  billingEnd?: Date;
  dataAvailableFrom?: Date;
}) {
  const [clicksResponse, linksUsage, payoutsUsage] = await Promise.all([
    getAnalytics({
      workspaceId,
      event: "clicks",
      groupBy: "count",
      start: billingStart,
      end: billingEnd,
      dataAvailableFrom,
    }),

    prisma.link.count({
      where: {
        projectId: workspaceId,
        createdAt: {
          gte: billingStart,
          lte: billingEnd,
        },
      },
    }),

    prisma.invoice.aggregate({
      where: {
        workspaceId,
        type: "partnerPayout",
        status: "completed",
        paidAt: {
          gte: billingStart,
          lte: billingEnd,
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const { clicks: usage } = analyticsResponse.count.parse(clicksResponse);

  return {
    usage,
    linksUsage,
    payoutsUsage: payoutsUsage._sum.amount ?? 0,
  };
}
