import { prisma } from "@/lib/prisma";
import { getCurrentPlan } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const tokens = await prisma.restrictedToken.findMany({
    select: {
      id: true,
      project: {
        select: {
          plan: true,
        },
      },
    },
    take: 500,
  });

  for (const token of tokens) {
    const plan = getCurrentPlan(token.project.plan);

    await prisma.restrictedToken.update({
      where: {
        id: token.id,
      },
      data: {
        rateLimit: plan.limits.api,
      },
    });
  }
}

main();
