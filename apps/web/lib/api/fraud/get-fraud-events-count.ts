import { fraudEventCountQuerySchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { FraudEventStatus, FraudRuleType, Prisma } from "@dub/prisma/client";
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

  // Group by status
  if (groupBy === "status") {
    const events = await prisma.fraudEvent.groupBy({
      by: ["status"],
      where: {
        ...commonWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          status: "desc",
        },
      },
    });

    Object.values(FraudEventStatus).forEach((status) => {
      if (!events.some((e) => e.status === status)) {
        events.push({ status, _count: 0 });
      }
    });

    return events;
  }

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

  // Get the absolute count of fraud events
  const count = await prisma.fraudEvent.count({
    where: {
      ...commonWhere,
    },
  });

  return count;
}
