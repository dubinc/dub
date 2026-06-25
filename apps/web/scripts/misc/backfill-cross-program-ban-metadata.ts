import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";
import { chunk } from "@dub/utils";
import { Prisma } from "@prisma/client";

// There are around 85+ fraud events that don't have the banned reason or banned at metadata.

async function main() {
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      fraudEventGroup: {
        type: "partnerCrossProgramBan",
      },
      metadata: {
        path: "$.bannedAt",
        equals: Prisma.JsonNull,
      },
      AND: {
        metadata: {
          path: "$.bannedReason",
          equals: Prisma.JsonNull,
        },
      },
    },
    select: {
      id: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log(`Found ${fraudEvents.length} fraud events to backfill`);

  console.table(fraudEvents);

  if (fraudEvents.length === 0) {
    return;
  }

  const chunks = chunk(fraudEvents, 10);

  for (const [index, batch] of chunks.entries()) {
    await prisma.$transaction(
      batch.map((event) =>
        prisma.fraudEvent.update({
          where: {
            id: event.id,
          },
          data: {
            metadata: {
              ...(event.metadata as Record<string, unknown>),
              bannedReason: "fraud",
              bannedAt: event.createdAt,
            },
          },
        }),
      ),
    );

    console.log(
      `Updated batch ${index + 1} of ${chunks.length} (${batch.length} fraud events)`,
    );
  }

  console.log(`Updated ${fraudEvents.length} fraud events`);
}

main();
