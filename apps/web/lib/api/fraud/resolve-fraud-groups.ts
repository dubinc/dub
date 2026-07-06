import { queueReleaseHoldCommissions } from "@/lib/api/fraud/release-hold-commissions";
import { prisma } from "@/lib/prisma";
import { prettyPrint } from "@dub/utils";
import { FraudEventStatus, Prisma } from "@prisma/client";

export async function resolveFraudGroups({
  where,
  userId,
  resolutionReason,
  releaseHoldCommissions = false,
}: {
  where: Prisma.FraudEventGroupWhereInput;
  userId?: string;
  resolutionReason?: string;
  releaseHoldCommissions?: boolean;
}) {
  const riskGroups = await prisma.fraudEventGroup.findMany({
    where: {
      ...where,
      status: FraudEventStatus.pending,
    },
    select: {
      id: true,
    },
  });

  if (riskGroups.length === 0) {
    return 0;
  }

  const riskGroupIds = riskGroups.map((g) => g.id);

  const { count } = await prisma.fraudEventGroup.updateMany({
    where: {
      id: {
        in: riskGroupIds,
      },
      status: FraudEventStatus.pending,
    },
    data: {
      userId,
      resolutionReason,
      resolvedAt: new Date(),
      status: FraudEventStatus.resolved,
    },
  });

  console.info(`Resolved ${count} fraud event groups ${prettyPrint(where)}`);

  if (releaseHoldCommissions && count > 0) {
    await queueReleaseHoldCommissions(riskGroupIds);
  }

  return count;
}
