import { prisma } from "@dub/prisma";
import { FraudRuleType } from "@prisma/client";
import { createId } from "../create-id";
import { createFraudEventGroupKey } from "./utils";

interface CreateFraudEventsInput {
  programId: string;
  partnerId: string;
  type: FraudRuleType;
  artifactKey?: string; // if not provided, partnerId will be used
}

export async function createFraudEvents(fraudEvents: CreateFraudEventsInput[]) {
  if (fraudEvents.length === 0) {
    return;
  }

  await prisma.fraudEvent.createMany({
    data: fraudEvents.map((event) => {
      const { programId, partnerId, type, artifactKey } = event;

      const groupKey = createFraudEventGroupKey({
        programId,
        type,
        artifactKey: artifactKey ?? partnerId,
      });

      return {
        id: createId({ prefix: "fre_" }),
        programId,
        partnerId,
        type,
        groupKey,
      };
    }),
  });

  console.info(`Created fraud events ${JSON.stringify(fraudEvents, null, 2)}`);
}
