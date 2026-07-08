import { getAnalytics } from "@/lib/analytics/get-analytics";
import { prisma } from "@/lib/prisma";
import { analyticsResponse } from "@/lib/zod/schemas/analytics-response";
import { getBillingStartDate } from "@dub/utils";
import { Project } from "@prisma/client";

export async function recomputeWorkspaceUsage(
  workspace: Pick<Project, "id" | "billingCycleStart">,
) {
  const billingStart = getBillingStartDate(workspace.billingCycleStart);
  const billingEnd = new Date();

  const [clicksResponse, linksUsage, payoutsUsage] = await Promise.all([
    getAnalytics({
      workspaceId: workspace.id,
      event: "clicks",
      groupBy: "count",
      start: billingStart,
      end: billingEnd,
    }),

    prisma.link.count({
      where: {
        projectId: workspace.id,
        createdAt: {
          gte: billingStart,
          lte: billingEnd,
        },
      },
    }),

    prisma.invoice.aggregate({
      where: {
        workspaceId: workspace.id,
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
