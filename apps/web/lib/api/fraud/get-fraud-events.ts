import { fraudEventsQuerySchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { z } from "zod";

type FraudEventFilters = z.infer<typeof fraudEventsQuerySchema> & {
  programId: string;
};

export async function getFraudEvents({
  programId,
  partnerId,
  status,
  type,
  page,
  pageSize,
  sortBy,
  sortOrder,
}: FraudEventFilters) {
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      programId,
      ...(status && { status }),
      ...(type && { type }),
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
      customer: {
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
      user: {
        select: {
          id: true,
          name: true,
          image: true,
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
