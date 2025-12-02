import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";

export async function resolveFraudGroups({
  where,
  userId,
  resolutionReason,
}: {
  where: Prisma.FraudEventGroupWhereInput;
  userId: string;
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

  console.info(
    `Resolved ${count} fraud event groups.`,
    JSON.stringify(where, null, 2),
  );

  return count;
}
