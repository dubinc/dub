import { createId } from "@/lib/api/create-id";
import { createGroupHash } from "@/lib/api/fraud/utils";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const fraudGroups = await prisma.fraudEvent.groupBy({
    by: ["groupKey"],
    _count: true,
  });

  for (const fraudGroup of fraudGroups) {
    const fraudEvents = await prisma.fraudEvent.findMany({
      where: {
        groupKey: fraudGroup.groupKey,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (fraudEvents.length === 0) {
      continue;
    }

    const lastFraudEvent = fraudEvents[0];
    const firstFraudEvent = fraudEvents[fraudEvents.length - 1];

    const fraudEventGroup = await prisma.fraudEventGroup.create({
      data: {
        id: createId({ prefix: "frg_" }),
        programId: firstFraudEvent.programId,
        partnerId: firstFraudEvent.partnerId!,
        type: firstFraudEvent.type,
        lastEventAt: lastFraudEvent.createdAt,
        eventCount: fraudEvents.length,
        userId: firstFraudEvent.userId,
        resolutionReason: firstFraudEvent.resolutionReason,
        resolvedAt: firstFraudEvent.resolvedAt,
        status: firstFraudEvent.status,
        hash: await createGroupHash({
          programId: firstFraudEvent.programId,
          partnerId: firstFraudEvent.partnerId!,
          type: firstFraudEvent.type,
          metadata: firstFraudEvent.metadata,
        }),
        createdAt: firstFraudEvent.createdAt,
        updatedAt: lastFraudEvent.createdAt,
      },
    });

    await prisma.fraudEvent.updateMany({
      where: {
        groupKey: fraudGroup.groupKey,
      },
      data: {
        fraudEventGroupId: fraudEventGroup.id,
      },
    });
  }
}

main();
