import { prisma } from "@/lib/prisma";
import { PARTNER_LEVEL_FRAUD_RULES } from "./constants";

export async function getFraudEventGroupEventIds({
  fraudEventGroupId,
  programId,
}: {
  fraudEventGroupId: string;
  programId: string;
}) {
  const riskEventGroup = await prisma.fraudEventGroup.findUniqueOrThrow({
    where: {
      id: fraudEventGroupId,
      programId,
    },
    select: {
      type: true,
    },
  });

  const isPartnerLevelRisk = PARTNER_LEVEL_FRAUD_RULES.includes(
    riskEventGroup.type as (typeof PARTNER_LEVEL_FRAUD_RULES)[number],
  );

  // Partner-level: include all commissions for the partner
  // Customer-level: include only commissions for the customers in the risk event group
  if (isPartnerLevelRisk) {
    return undefined;
  }

  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      fraudEventGroupId,
      programId,
      eventId: {
        not: null,
      },
    },
    distinct: ["eventId"],
    select: {
      eventId: true,
    },
  });

  const eventIds = [
    ...new Set(
      fraudEvents
        .map((e) => e.eventId)
        .filter((id): id is string => id !== null),
    ),
  ];

  return eventIds.length > 0 ? eventIds : undefined;
}
