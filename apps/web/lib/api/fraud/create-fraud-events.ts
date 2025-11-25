import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { createId } from "../create-id";
import { createFraudEventGroupKey } from "./utils";

export async function createFraudEvents(
  fraudEvents: Pick<
    Prisma.FraudEventCreateManyInput,
    "programId" | "partnerId" | "type"
  >[],
) {
  if (fraudEvents.length === 0) {
    return;
  }

  await prisma.fraudEvent.createMany({
    data: fraudEvents.map((evt) => {
      const { programId, partnerId, type } = evt;

      const groupKey = createFraudEventGroupKey({
        programId,
        partnerId,
        type,
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
