import { prisma } from "@dub/prisma";
import { getCurrentPlan } from "@dub/utils";
import "dotenv-flow/config";

// one time script for backfilling groupsLimit for workspaces
async function main() {
  const workspaces = await prisma.project.findMany({
    where: {
      groupsLimit: 0,
      plan: {
        notIn: ["free", "pro"],
      },
    },
    select: {
      id: true,
      slug: true,
      plan: true,
      groupsLimit: true,
    },
    take: 100,
  });

  if (workspaces.length === 0) {
    console.log("No workspaces to update.");
    return;
  }

  console.table(workspaces);
  console.log(`Found ${workspaces.length} workspaces to update.`);

  // Batch update the workspaces
  // if "business plus/extra/max", group under business
  const groupedByPlan = workspaces.reduce(
    (acc, ws) => {
      const plan = ws.plan.startsWith("business") ? "business" : ws.plan;
      if (!acc[plan]) acc[plan] = [];
      acc[plan].push(ws.id);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  console.log(groupedByPlan);

  for (const [plan, workspaceIds] of Object.entries(groupedByPlan)) {
    await prisma.project.updateMany({
      where: {
        id: {
          in: workspaceIds,
        },
      },
      data: {
        groupsLimit: getCurrentPlan(plan).limits.groups!,
      },
    });
  }
}

main();
