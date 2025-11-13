import { fraudEventListQuerySchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { z } from "zod";

type FraudEventFilters = z.infer<typeof fraudEventListQuerySchema> & {
  programId: string;
};

export async function getFraudEvents(filters: FraudEventFilters) {
  const {
    status,
    riskLevel,
    partnerId,
    page,
    pageSize,
    sortBy,
    sortOrder,
    programId,
  } = filters;

  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      programId,
      ...(status && { status }),
      ...(riskLevel && { riskLevel }),
      ...(partnerId && { partnerId }),
    },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      commission: {
        select: {
          id: true,
          earnings: true,
          currency: true,
          status: true,
        },
      },
    },
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  return fraudEvents.map((event) => ({
    ...event,
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
    resolvedAt: event.resolvedAt ? new Date(event.resolvedAt) : null,
  }));
}
