import { prisma } from "@dub/prisma";
import { getPlanDetails } from "@dub/utils";
import "dotenv-flow/config";

// Backfills partnersUsage and partnersLimit for all workspaces.
async function main() {
  let cursor: { id: string } | undefined;

  while (true) {
    const workspaces = await prisma.project.findMany({
      where: {
        defaultProgramId: {
          not: null,
        },
        partnersLimit: 0,
      },
      select: {
        id: true,
        plan: true,
        planTier: true,
        defaultProgramId: true,
      },
      take: 1,
      skip: cursor ? 1 : 0,
      cursor,
      orderBy: { id: "asc" },
    });

    if (workspaces.length === 0) {
      break;
    }

    cursor = { id: workspaces[workspaces.length - 1].id };

    // Find partners usage for each program
    const partnersUsage = await prisma.programEnrollment.groupBy({
      by: ["programId"],
      where: {
        programId: {
          in: workspaces.map(({ defaultProgramId }) => defaultProgramId!),
        },
        status: {
          notIn: ["pending", "rejected", "declined"],
        },
      },
      _count: {
        _all: true,
      },
    });

    // Create a map of programId to usage
    const programIdToUsage = new Map<string, number>();

    for (const { programId, _count } of partnersUsage) {
      programIdToUsage.set(programId, _count._all);
    }

    const toUpdate = workspaces.map((workspace) => {
      const planDetails = getPlanDetails({
        plan: workspace.plan,
        planTier: workspace.planTier,
      });

      return {
        id: workspace.id,
        partnersUsage: programIdToUsage.get(workspace.defaultProgramId!) ?? 0,
        partnersLimit: planDetails?.limits.partners ?? 0,
      };
    });

    console.table(toUpdate);

    await Promise.all(
      toUpdate.map((workspace) => {
        return prisma.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            partnersUsage: workspace.partnersUsage,
            partnersLimit: workspace.partnersLimit,
          },
        });
      }),
    );
  }
}

main();
