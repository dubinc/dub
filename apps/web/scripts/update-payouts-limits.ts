import { prisma } from "@dub/prisma";
import { getFirstAndLastDay } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  // const workspaces = await prisma.project.updateMany({
  //   where: {
  //     plan: {
  //       startsWith: "business",
  //     },
  //   },
  //   data: {
  //     payoutsLimit: 2_500_00,
  //   },
  // });

  // console.table(workspaces);

  // workspace with payouts in the last 30 days
  const workspaceWithPayouts = await prisma.invoice.groupBy({
    by: ["workspaceId"],
    where: {
      createdAt: {
        gte: new Date(new Date().setDate(new Date().getDate() - 30)),
      },
    },
    _sum: {
      amount: true,
    },
  });

  console.table(workspaceWithPayouts);

  const res = await Promise.all(
    workspaceWithPayouts.map(async (w) => {
      if (!w.workspaceId) {
        return;
      }

      const workspace = await prisma.project.findUnique({
        where: { id: w.workspaceId },
      });

      if (!workspace) {
        return;
      }

      const { firstDay } = getFirstAndLastDay(workspace.billingCycleStart);

      const invoices = await prisma.invoice.aggregate({
        where: {
          workspaceId: workspace.id,
          createdAt: {
            gte: firstDay,
          },
        },
        _sum: {
          amount: true,
        },
      });

      await prisma.project.update({
        where: { id: workspace.id },
        data: {
          payoutsUsage: invoices._sum.amount ?? 0,
        },
      });

      return {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        payoutsUsage: invoices._sum.amount,
        payoutsLimit: workspace.payoutsLimit,
      };
    }),
  );

  console.table(res);
}

main();
