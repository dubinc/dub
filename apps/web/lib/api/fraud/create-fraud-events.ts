import { CreateFraudEventInput } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { FraudRuleType, Prisma } from "@prisma/client";
import { createId } from "../create-id";
import {
  createFraudEventFingerprint,
  createFraudEventGroupKey,
  createFraudGroupHash,
} from "./utils";

export async function createFraudEvents(fraudEvents: CreateFraudEventInput[]) {
  if (fraudEvents.length === 0) {
    return;
  }

  for (const fraudEvent of fraudEvents) {
    const fingerprint = createFraudEventFingerprint(fraudEvent);

    const existingFraudEvent = await prisma.fraudEvent.findFirst({
      where: {
        fingerprint,
        fraudEventGroup: {
          status: "pending",
        },
      },
    });

    if (existingFraudEvent) {
      continue;
    }

    const groupHash = await createFraudGroupHash(fraudEvent);

    let fraudEventGroup = await prisma.fraudEventGroup.findFirst({
      where: {
        hash: groupHash,
        status: "pending",
      },
    });

    if (!fraudEventGroup) {
      fraudEventGroup = await prisma.fraudEventGroup.create({
        data: {
          id: createId({ prefix: "frg_" }),
          programId: fraudEvent.programId,
          partnerId: fraudEvent.partnerId,
          type: fraudEvent.type,
          hash: groupHash,
        },
      });
    }

    await prisma.fraudEvent.create({
      data: {
        id: createId({ prefix: "fre_" }),
        fraudEventGroupId: fraudEventGroup.id,
        eventId: fraudEvent.eventId,
        linkId: fraudEvent.linkId,
        customerId: fraudEvent.customerId,
        metadata: fraudEvent.metadata as Prisma.InputJsonValue,
        fingerprint,
        ...(fraudEvent.type === FraudRuleType.partnerDuplicatePayoutMethod && {
          partnerId: (fraudEvent.metadata as Record<string, string>)
            ?.duplicatePartnerId,
        }),

        // DEPRECATED FIELDS: TODO – remove after migration
        programId: fraudEvent.programId,
        type: fraudEvent.type,
        groupKey: createFraudEventGroupKey({
          programId: fraudEvent.programId,
          type: fraudEvent.type,
          groupingKey: fraudEvent.partnerId,
        }),
      },
    });

    await prisma.fraudEventGroup.update({
      where: {
        id: fraudEventGroup.id,
      },
      data: {
        lastEventAt: new Date(),
        eventCount: {
          increment: 1,
        },
      },
    });
  }
}
