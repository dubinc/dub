import { CreateFraudEventInput } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { createId } from "../create-id";
import {
  createFraudEventFingerprint,
  createFraudEventGroupKey,
  getIdentityFieldsForRule,
} from "./utils";

export async function createFraudEvents(fraudEvents: CreateFraudEventInput[]) {
  if (fraudEvents.length === 0) {
    return;
  }

  for (const fraudEvent of fraudEvents) {
    const fingerprint = createFraudEventFingerprint({
      programId: fraudEvent.programId,
      partnerId: fraudEvent.partnerId,
      type: fraudEvent.type,
      identityFields: getIdentityFieldsForRule(fraudEvent),
    });

    const existingFraudEvent = await prisma.fraudEvent.findFirst({
      where: {
        fingerprint,
        fraudEventGroup: {
          is: {
            status: "pending",
          },
        },
      },
    });

    if (existingFraudEvent) {
      continue;
    }

    let fraudEventGroup = await prisma.fraudEventGroup.findFirst({
      where: {
        programId: fraudEvent.programId,
        partnerId: fraudEvent.partnerId,
        type: fraudEvent.type,
        status: "pending",
      },
    });

    if (!fraudEventGroup) {
      console.info(`Creating new fraud event group for partner.`);

      fraudEventGroup = await prisma.fraudEventGroup.create({
        data: {
          id: createId({ prefix: "frg_" }),
          programId: fraudEvent.programId,
          partnerId: fraudEvent.partnerId,
          type: fraudEvent.type,
        },
      });
    }

    const createdFraudEvent = await prisma.fraudEvent.create({
      data: {
        id: createId({ prefix: "fre_" }),
        fraudEventGroupId: fraudEventGroup.id,
        eventId: fraudEvent.eventId,
        linkId: fraudEvent.linkId,
        customerId: fraudEvent.customerId,
        metadata: fraudEvent.metadata as Prisma.InputJsonValue,
        fingerprint,

        // DEPRECATED FIELDS: TODO – remove after migration
        programId: fraudEvent.programId,
        partnerId: fraudEvent.partnerId,
        type: fraudEvent.type,
        groupKey: createFraudEventGroupKey({
          programId: fraudEvent.programId,
          type: fraudEvent.type,
          groupingKey: fraudEvent.partnerId,
        }),
      },
    });

    console.info(
      `Created fraud event ${JSON.stringify(createdFraudEvent, null, 2)}`,
    );

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
