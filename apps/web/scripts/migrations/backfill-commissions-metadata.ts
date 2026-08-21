import { prisma } from "@/lib/prisma";
import { tb } from "@/lib/tinybird/client";
import { CommissionType, Prisma } from "@prisma/client";
import "dotenv-flow/config";
import * as z from "zod/v4";

/*
Pipe name: internal_get_events_metadata

Create this once in Tinybird before running:

SELECT event_id, metadata
FROM dub_lead_events_mv
WHERE event_id IN {{ Array(eventIds, 'String') }}
  AND metadata != ''
UNION ALL
SELECT event_id, metadata
FROM dub_sale_events_mv
WHERE event_id IN {{ Array(eventIds, 'String') }}
  AND metadata != ''
*/

const DRY_RUN = true;
const BATCH_SIZE = 100;
const THROTTLE_MS = 1000;
const LAST_CURSOR_ID: string | null = null; // Paste the last printed cursor id here to resume after a crash.

const getEventsMetadata = tb.buildPipe({
  pipe: "internal_get_events_metadata",
  parameters: z.object({
    eventIds: z.string().array(),
  }),
  data: z.object({
    event_id: z.string(),
    metadata: z.string(),
  }),
});

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(
    `DRY_RUN=${DRY_RUN} BATCH_SIZE=${BATCH_SIZE} THROTTLE_MS=${THROTTLE_MS}`,
  );

  let startingAfter = LAST_CURSOR_ID ?? undefined;
  if (startingAfter) {
    console.log(`Resuming from ${startingAfter}`);
  }

  let totalScanned = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  while (true) {
    const commissions = await prisma.commission.findMany({
      where: {
        type: {
          in: [CommissionType.lead, CommissionType.sale],
        },
        eventId: {
          not: null,
        },
        metadata: {
          equals: Prisma.DbNull,
        },
        ...(startingAfter && {
          id: {
            gt: startingAfter,
          },
        }),
      },
      select: {
        id: true,
        eventId: true,
        type: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (commissions.length === 0) {
      break;
    }

    totalScanned += commissions.length;

    const eventIds = commissions
      .map((c) => c.eventId)
      .filter((id): id is string => Boolean(id));

    const { data: tbRows } = await getEventsMetadata({ eventIds });
    const metadataByEventId = new Map(
      tbRows.map((row) => [row.event_id, row.metadata]),
    );

    const updates: { id: string; metadata: Record<string, unknown> }[] = [];
    let batchSkipped = 0;
    let batchErrors = 0;

    for (const commission of commissions) {
      const raw = commission.eventId
        ? metadataByEventId.get(commission.eventId)
        : undefined;

      if (!raw) {
        batchSkipped++;
        continue;
      }

      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        updates.push({ id: commission.id, metadata: parsed });
      } catch (error) {
        batchErrors++;
        console.error(
          `Failed to parse metadata for commission ${commission.id} eventId=${commission.eventId}`,
          error,
        );
      }
    }

    totalSkipped += batchSkipped;
    totalErrors += batchErrors;

    if (DRY_RUN) {
      console.table(
        updates.slice(0, 10).map((u) => {
          const commission = commissions.find((c) => c.id === u.id)!;
          return {
            id: u.id,
            eventId: commission.eventId,
            type: commission.type,
            metadata: u.metadata,
          };
        }),
      );
      totalUpdated += updates.length;
      console.log(
        `Batch: scanned=${commissions.length} would-update=${updates.length} skipped=${batchSkipped} errors=${batchErrors}`,
      );
    } else if (updates.length > 0) {
      const updatedCount = await prisma.$executeRaw`
        UPDATE Commission
        SET
          metadata = CASE id
            ${Prisma.join(
              updates.map(
                (u) =>
                  Prisma.sql`WHEN ${u.id} THEN ${JSON.stringify(u.metadata)}`,
              ),
              " ",
            )}
          END,
          updatedAt = NOW()
        WHERE id IN (${Prisma.join(updates.map((u) => u.id))})
          AND metadata IS NULL
      `;

      totalUpdated += Number(updatedCount);
      console.log(
        `Batch: scanned=${commissions.length} updated=${updatedCount} skipped=${batchSkipped} errors=${batchErrors}`,
      );
    } else {
      console.log(
        `Batch: scanned=${commissions.length} updated=0 skipped=${batchSkipped} errors=${batchErrors}`,
      );
    }

    startingAfter = commissions[commissions.length - 1].id;
    console.log(`last cursor: ${startingAfter}`);

    if (commissions.length < BATCH_SIZE) {
      break;
    }

    await sleep(THROTTLE_MS);
  }

  console.log(
    `Finished. scanned=${totalScanned} ${DRY_RUN ? "would-update" : "updated"}=${totalUpdated} skipped=${totalSkipped} errors=${totalErrors}`,
  );
}

main();
