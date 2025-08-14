import { prisma } from "@dub/prisma";
import { getCurrentPlan } from "@dub/utils";
import "dotenv-flow/config";

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

  await Promise.allSettled(
    workspaces.map((workspace) => {
      const plan = getCurrentPlan(workspace.plan);

      return prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          groupsLimit: plan.limits.groups!,
        },
      });
    }),
  );
}

main();
