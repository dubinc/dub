import { Prisma, prisma } from "@dub/prisma/node";
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
  const { count } = await prisma.fraudEventGroup.updateMany({
    where: {
      ...where,
      status: "pending",
    },
    data: {
      userId,
      resolutionReason,
      resolvedAt: new Date(),
      status: "resolved",
    },
  });

  console.info(`Resolved ${count} fraud event groups ${prettyPrint(where)}`);

  return count;
}
