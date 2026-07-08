import { getAnalytics } from "@/lib/analytics/get-analytics";
import { prisma } from "@/lib/prisma";
import { chunk } from "@dub/utils";
import { subYears } from "date-fns";
import "dotenv-flow/config";

// TODO: will need to also double check that billingCycleEndsAt is actually reliable
async function main() {
  while (true) {
    const workspaces = await prisma.project.findMany({
      where: {
        trialEndsAt: {
          not: null,
        },
        planPeriod: "yearly",
        // Unmigrated yearly workspaces still have monthly AI limits
        aiLimit: 1000,
        billingCycleEndsAt: {
          not: null,
        },
      },
      take: 500,
    });

    if (workspaces.length === 0) {
      console.log("No yearly workspaces left to update");
      break;
    }

    const workspaceChunks = chunk(workspaces, 10);

    for (const workspaceChunk of workspaceChunks) {
      await Promise.allSettled(
        workspaceChunk.map(async (workspace) => {
          const billingStart = subYears(workspace.billingCycleEndsAt!, 1);

          const [clicksResponse, linksUsage, payoutsUsage] = await Promise.all([
            getAnalytics({
              workspaceId: workspace.id,
              event: "clicks",
              groupBy: "count",
              start: billingStart,
              end: new Date(),
              dataAvailableFrom: workspace.createdAt,
            }),
            prisma.link.count({
              where: {
                projectId: workspace.id,
                createdAt: {
                  gte: billingStart,
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
                },
              },
              _sum: {
                amount: true,
              },
            }),
          ]);

          const usage =
            typeof clicksResponse === "object" && clicksResponse !== null
              ? (clicksResponse as { clicks?: number }).clicks ?? 0
              : typeof clicksResponse === "number"
                ? clicksResponse
                : 0;

          const newUsageLimit = workspace.usageLimit * 12;
          const newLinksLimit = workspace.linksLimit * 12;
          const newPayoutsLimit = workspace.payoutsLimit * 12;
          const newAiLimit = workspace.aiLimit * 12;
          const newPayoutsUsage = payoutsUsage._sum.amount ?? 0;

          await prisma.project.update({
            where: {
              id: workspace.id,
            },
            data: {
              usage,
              linksUsage,
              payoutsUsage: newPayoutsUsage,
              usageLimit: newUsageLimit,
              linksLimit: newLinksLimit,
              payoutsLimit: newPayoutsLimit,
              aiLimit: newAiLimit,
            },
          });

          console.log(
            `Updated ${workspace.slug}: clicks ${usage}/${newUsageLimit}, links ${linksUsage}/${newLinksLimit}, payouts ${newPayoutsUsage}/${newPayoutsLimit}, ai ${workspace.aiUsage}/${newAiLimit}`,
          );
        }),
      );
    }
  }
}

main();
