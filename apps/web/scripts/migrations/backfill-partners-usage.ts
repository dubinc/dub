import { prisma } from "@dub/prisma";
import { getPlanDetails, TRIAL_LIMITS } from "@dub/utils";
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
      },
      select: {
        id: true,
        slug: true,
        plan: true,
        planTier: true,
        trialEndsAt: true,
        defaultProgramId: true,
      },
      take: 10,
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
        plan: workspace.plan.split(" ")[0],
        planTier: workspace.planTier,
      });

      return {
        id: workspace.id,
        slug: workspace.slug,
        partnersUsage: programIdToUsage.get(workspace.defaultProgramId!) ?? 0,
        partnersLimit: workspace.trialEndsAt
          ? TRIAL_LIMITS.partners
          : planDetails?.limits.partners ?? 0,
      };
    });

    console.table(toUpdate);

    await Promise.all(
      toUpdate.map((workspace) =>
        prisma.project.update({
          where: {
            id: workspace.id,
          },
          data: {
            partnersUsage: workspace.partnersUsage,
            partnersLimit: workspace.partnersLimit,
          },
        }),
      ),
    );
  }
}

main();
