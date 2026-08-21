import { formatUTCDateTimeClickhouse } from "@/lib/analytics/utils/format-utc-datetime-clickhouse";
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
  AND timestamp BETWEEN {{ DateTime(start) }} AND {{ DateTime(end) }}
  AND metadata != ''
UNION ALL
SELECT event_id, metadata
FROM dub_sale_events_mv
WHERE event_id IN {{ Array(eventIds, 'String') }}
  AND timestamp BETWEEN {{ DateTime(start) }} AND {{ DateTime(end) }}
  AND metadata != ''
*/

const DRY_RUN = true;
const BATCH_SIZE = 1000;
const THROTTLE_MS = 1000;
const LAST_CURSOR_ID: string | null = null; // Paste the last printed cursor id here to resume after a crash.
const USER_METADATA_MAX_CHARS = 10_000; // Matches metadataSchema in lib/zod/schemas/misc.ts
const TIMESTAMP_PAD_MS = 86_400_000; // ±1 day: commission createdAt can lag Tinybird event timestamp

const getEventsMetadata = tb.buildPipe({
  pipe: "internal_get_events_metadata",
  parameters: z.object({
    eventIds: z.string().array(),
    start: z.string(),
    end: z.string(),
  }),
  data: z.object({
    event_id: z.string(),
    metadata: z.string(),
  }),
});

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Tinybird event metadata is not always user-provided. Stripe/Shopify/importers
// store full internal payloads; Commission.metadata is a public API field.
// Match nested resource shapes (not just key names) to avoid false positives
// from coincidental user metadata like { invoice: "in_123" }.
function looksLikeInternalEventPayload(metadata: Record<string, unknown>) {
  // Stripe webhook: { invoice } or { checkoutSession } — nested Stripe objects
  if (
    isPlainObject(metadata.invoice) ||
    isPlainObject(metadata.checkoutSession)
  ) {
    return true;
  }

  // Shopify order body
  if (
    typeof metadata.checkout_token === "string" &&
    typeof metadata.confirmation_number === "string" &&
    isPlainObject(metadata.current_subtotal_price_set)
  ) {
    return true;
  }

  // Skip Rewardful/Tapfiliate/Tolt/PartnerStack fingerprints: oversized dumps
  // are already dropped by USER_METADATA_MAX_CHARS, and small payloads are
  // allowed through (avoids rejecting coincidental user keys).

  return false;
}

function parseUserProvidedMetadata(
  raw: string,
): Record<string, unknown> | null {
  if (raw.length > USER_METADATA_MAX_CHARS) {
    return null;
  }

  const parsed: unknown = JSON.parse(raw);

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const metadata = parsed as Record<string, unknown>;

  if (
    Object.keys(metadata).length === 0 ||
    looksLikeInternalEventPayload(metadata)
  ) {
    return null;
  }

  return metadata;
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
        createdAt: true,
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

    const start = new Date(
      Math.min(...commissions.map((c) => c.createdAt.getTime())) -
        TIMESTAMP_PAD_MS,
    );

    const end = new Date(
      Math.max(...commissions.map((c) => c.createdAt.getTime())) +
        TIMESTAMP_PAD_MS,
    );

    const { data: tbRows } = await getEventsMetadata({
      eventIds,
      start: formatUTCDateTimeClickhouse(start),
      end: formatUTCDateTimeClickhouse(end),
    });
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
        const metadata = parseUserProvidedMetadata(raw);
        if (!metadata) {
          batchSkipped++;
          continue;
        }

        updates.push({ id: commission.id, metadata });
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
          END
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
