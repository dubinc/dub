import { fraudEventCountQuerySchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { FraudRuleType, Prisma } from "@dub/prisma/client";
import { z } from "zod";

type FraudEventCountFilters = z.infer<typeof fraudEventCountQuerySchema> & {
  programId: string;
};

export async function getFraudEventsCount({
  status,
  type,
  partnerId,
  groupBy,
  programId,
}: FraudEventCountFilters) {
  const commonWhere: Prisma.FraudEventWhereInput = {
    programId,
    ...(status && { status }),
    ...(type && { type }),
    ...(partnerId && { partnerId }),
  };

  // Group by type
  if (groupBy === "type") {
    const events = await prisma.fraudEvent.groupBy({
      by: ["type"],
      where: {
        ...commonWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          type: "desc",
        },
      },
    });

    Object.values(FraudRuleType).forEach((type) => {
      if (!events.some((e) => e.type === type)) {
        events.push({ type, _count: 0 });
      }
    });

    return events;
  }

  // Group by partnerId
  if (groupBy === "partnerId") {
    const events = await prisma.fraudEvent.groupBy({
      by: ["partnerId"],
      where: {
        ...commonWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          partnerId: "desc",
        },
      },
    });

    return events;
  }

  // Get the distinct group keys
  const distinctGroupKeys = await prisma.fraudEvent.groupBy({
    by: ["groupKey"],
    where: {
      ...commonWhere,
    },
  });

  return distinctGroupKeys.length;
}
