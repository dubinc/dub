import { prisma } from "@/lib/prisma";
import { getWorkspaceUsage } from "@/lib/tinybird/get-workspace-usage";
import { chunk, INFINITY_NUMBER } from "@dub/utils";
import { subYears } from "date-fns";
import "dotenv-flow/config";

// TODO: will need to also double check that billingCycleEndsAt is actually reliable
async function main() {
  while (true) {
    const workspaces = await prisma.project.findMany({
      where: {
        planPeriod: "yearly",
        aiLimit: 1000, // Unmigrated yearly workspaces still have monthly AI limits
        trialEndsAt: null, // ignore trial
        // ignore free plan
        plan: {
          not: "free",
        },
        // shouldn't happen but just in case
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

    const workspaceChunks = chunk(workspaces, 5);

    for (const workspaceChunk of workspaceChunks) {
      await Promise.allSettled(
        workspaceChunk.map(async (workspace) => {
          const billingStart = subYears(workspace.billingCycleEndsAt!, 1);
          const billingEnd = new Date();

          const [usage, linksUsage, payoutsUsage] = await Promise.all([
            getWorkspaceUsage({
              workspaceId: workspace.id,
              resource: "events",
              start: billingStart,
              end: billingEnd,
            }).then((data) => data.reduce((acc, curr) => acc + curr.value, 0)),

            getWorkspaceUsage({
              workspaceId: workspace.id,
              resource: "links",
              start: billingStart,
              end: billingEnd,
            }).then((data) => data.reduce((acc, curr) => acc + curr.value, 0)),

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

          const newUsageLimit = Math.min(
            workspace.usageLimit * 12,
            INFINITY_NUMBER,
          );
          const newLinksLimit = Math.min(
            workspace.linksLimit * 12,
            INFINITY_NUMBER,
          );
          const newPayoutsLimit = Math.min(
            workspace.payoutsLimit * 12,
            INFINITY_NUMBER,
          );
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
