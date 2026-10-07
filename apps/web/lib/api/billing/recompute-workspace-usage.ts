import { prisma } from "@/lib/prisma";
import { getWorkspaceUsage } from "@/lib/tinybird/get-workspace-usage";
import { getBillingStartDate } from "@dub/utils";
import { Project } from "@prisma/client";

const sum = (arr: number[]) => arr.reduce((acc, curr) => acc + curr, 0);

export async function recomputeWorkspaceUsage(
  workspace: Pick<Project, "id" | "billingCycleStart">,
) {
  const billingStart = getBillingStartDate(workspace.billingCycleStart);
  const billingEnd = new Date();

  const [clicksData, linksData, payoutsUsage] = await Promise.all([
    getWorkspaceUsage({
      workspaceId: workspace.id,
      resource: "events",
      start: billingStart,
      end: billingEnd,
    }),

    getWorkspaceUsage({
      workspaceId: workspace.id,
      resource: "links",
      start: billingStart,
      end: billingEnd,
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

  return {
    usage: sum(clicksData.map((d) => d.value)),
    linksUsage: sum(linksData.map((d) => d.value)),
    payoutsUsage: payoutsUsage._sum.amount ?? 0,
  };
}
