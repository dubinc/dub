import { prisma } from "@dub/prisma";
import { FraudEvent, FraudEventGroup, Prisma } from "@prisma/client";
import { createId } from "../create-id";
import { createFraudEventFingerprint, createFraudEventGroupKey } from "./utils";

type CreateFraudEventsInput = Pick<
  FraudEventGroup,
  "programId" | "partnerId" | "type"
> &
  Partial<Pick<FraudEvent, "linkId" | "eventId" | "customerId" | "metadata">>;

export async function createFraudEvents(fraudEvents: CreateFraudEventsInput[]) {
  if (fraudEvents.length === 0) {
    return;
  }

  for (const fraudEvent of fraudEvents) {
    const fingerprint = createFraudEventFingerprint({
      programId: fraudEvent.programId,
      partnerId: fraudEvent.partnerId,
      type: fraudEvent.type,
      identityFields: {
        ...(fraudEvent.customerId ? { customerId: fraudEvent.customerId } : {}),
      },
    });

    console.log("fingerprint", fingerprint);

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
      console.info(
        `Skipping duplicate fraud event with fingerprint ${fingerprint}.`,
      );

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
          // lastEventAt: new Date(),
          // eventCount: 1,
        },
      });
    }

    const groupKey = createFraudEventGroupKey({
      programId: fraudEvent.programId,
      type: fraudEvent.type,
      groupingKey: fraudEvent.partnerId,
    });

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
        groupKey,
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
