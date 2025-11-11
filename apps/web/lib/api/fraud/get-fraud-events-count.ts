import { FraudEventCountQuerySchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { FraudEventStatus, FraudRiskLevel, Prisma } from "@dub/prisma/client";
import { z } from "zod";

type FraudEventCountFilters = z.infer<typeof FraudEventCountQuerySchema> & {
  programId: string;
};

export async function getFraudEventsCount(filters: FraudEventCountFilters) {
  const { status, riskLevel, partnerId, groupBy, programId } = filters;

  const commonWhere: Prisma.FraudEventWhereInput = {
    programId,
    ...(status && { status }),
    ...(riskLevel && { riskLevel }),
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
        events.push({ _count: 0, status });
      }
    });

    return events;
  }

  // Group by risk level
  if (groupBy === "riskLevel") {
    const events = await prisma.fraudEvent.groupBy({
      by: ["riskLevel"],
      where: {
        ...commonWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          riskLevel: "desc",
        },
      },
    });

    Object.values(FraudRiskLevel).forEach((riskLevel) => {
      if (!events.some((e) => e.riskLevel === riskLevel)) {
        events.push({ _count: 0, riskLevel });
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

