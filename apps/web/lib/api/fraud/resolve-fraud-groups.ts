import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { prettyPrint } from "@dub/utils";

export async function resolveFraudGroups({
  where,
  userId,
  resolutionReason,
}: {
  where: Prisma.FraudEventGroupWhereInput;
  userId?: string;
  resolutionReason?: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const pendingGroups = await tx.fraudEventGroup.findMany({
      where: {
        ...where,
        status: "pending",
      },
      select: {
        id: true,
      },
    });

    const pendingGroupIds = pendingGroups.map(({ id }) => id);

    if (pendingGroupIds.length === 0) {
      return {
        count: 0,
        resolvedGroupIds: [] as string[],
      };
    }

    const resolvedAt = new Date();

    const { count } = await tx.fraudEventGroup.updateMany({
      where: {
        id: {
          in: pendingGroupIds,
        },
        status: "pending",
      },
      data: {
        userId,
        resolutionReason,
        resolvedAt,
        status: "resolved",
      },
    });

    if (count === pendingGroupIds.length) {
      return {
        count,
        resolvedGroupIds: pendingGroupIds,
      };
    }

    // In case of concurrent updates, only return groups that were updated in this call.
    const resolvedGroups = await tx.fraudEventGroup.findMany({
      where: {
        id: {
          in: pendingGroupIds,
        },
        status: "resolved",
        resolvedAt,
      },
      select: {
        id: true,
      },
    });

    return {
      count,
      resolvedGroupIds: resolvedGroups.map(({ id }) => id),
    };
  });

  console.info(
    `Resolved ${result.count} fraud event groups ${prettyPrint(where)}`,
  );

  return result;
}
