import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";
import { tb } from "@/lib/tinybird/client";
import { chunk, sleep } from "@dub/utils";
import { CommissionSource, CommissionType } from "@prisma/client";
import * as z from "zod/v4";

const DRY_RUN = true;
const FETCH_BATCH_SIZE = 100;
const UPDATE_CHUNK_SIZE = 50;
const THROTTLE_MS = 1000;
const LAST_CURSOR_ID: string | null = null;

const getSaleEventsMetadata = tb.buildPipe({
  pipe: "internal_get_events_metadata",
  parameters: z.object({
    eventIds: z.string().array(),
  }),
  data: z.object({
    event_id: z.string(),
    metadata: z.string(),
  }),
});

// TODO:
// Find all migrated program ids from TB
// Verify identifyImportSource is working correctly different sources

const migratedProgramIds = [""];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function identifyImportSource(raw: string): CommissionSource | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) {
    return null;
  }

  if (
    "due_at" in parsed &&
    "campaign" in parsed &&
    isPlainObject(parsed.sale) &&
    "stripe_charge_id" in parsed.sale
  ) {
    return CommissionSource.rewardful;
  }

  if (
    "transaction_id" in parsed &&
    "charge_id" in parsed &&
    "partner" in parsed
  ) {
    return CommissionSource.tolt;
  }

  if ("reward_status" in parsed && "partnership" in parsed && "key" in parsed) {
    return CommissionSource.partnerstack;
  }

  if (
    "conversion_sub_amount" in parsed &&
    "approved" in parsed &&
    "currency" in parsed
  ) {
    return CommissionSource.tapfiliate;
  }

  if (
    "store_id" in parsed &&
    "subtotal" in parsed &&
    ("first_order_item" in parsed || "billing_reason" in parsed)
  ) {
    return CommissionSource.lemonsqueezy;
  }

  return null;
}

async function updateCommissionSources(
  updates: { id: string; source: CommissionSource }[],
) {
  const idsBySource = new Map<CommissionSource, string[]>();

  for (const update of updates) {
    const ids = idsBySource.get(update.source) ?? [];
    ids.push(update.id);
    idsBySource.set(update.source, ids);
  }

  let updated = 0;

  for (const [source, ids] of idsBySource) {
    for (const idsChunk of chunk(ids, UPDATE_CHUNK_SIZE)) {
      if (DRY_RUN) {
        updated += idsChunk.length;
        continue;
      }

      const result = await prisma.commission.updateMany({
        where: {
          id: {
            in: idsChunk,
          },
          source: null,
        },
        data: {
          source,
        },
      });

      updated += result.count;
    }
  }

  return updated;
}

async function main() {
  console.log(
    `DRY_RUN=${DRY_RUN} FETCH_BATCH_SIZE=${FETCH_BATCH_SIZE} UPDATE_CHUNK_SIZE=${UPDATE_CHUNK_SIZE}`,
  );

  let startingAfter = LAST_CURSOR_ID ?? undefined;

  if (startingAfter) {
    console.log(`Resuming from ${startingAfter}`);
  }

  let totalScanned = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  while (true) {
    const commissions = await prisma.commission.findMany({
      where: {
        type: CommissionType.sale,
        eventId: {
          not: null,
        },
        source: null,
        programId: {
          in: migratedProgramIds,
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
      },
      take: FETCH_BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (commissions.length === 0) {
      break;
    }

    totalScanned += commissions.length;

    const eventIds = commissions
      .map((commission) => commission.eventId)
      .filter((eventId): eventId is string => Boolean(eventId));

    const { data: saleEvents } = await getSaleEventsMetadata({
      eventIds,
    });

    const metadataByEventId = new Map(
      saleEvents.map((saleEvent) => [saleEvent.event_id, saleEvent.metadata]),
    );

    const updates: { id: string; source: CommissionSource }[] = [];
    let batchSkipped = 0;

    for (const commission of commissions) {
      const raw = commission.eventId
        ? metadataByEventId.get(commission.eventId)
        : undefined;

      if (!raw) {
        batchSkipped++;
        continue;
      }

      const source = identifyImportSource(raw);

      if (!source) {
        batchSkipped++;
        continue;
      }

      updates.push({
        id: commission.id,
        source,
      });
    }

    const updated = await updateCommissionSources(updates);

    totalUpdated += updated;
    totalSkipped += batchSkipped;

    if (DRY_RUN && updates.length > 0) {
      console.table(updates.slice(0, 10));
    }

    console.log(
      `Batch: scanned=${commissions.length} ${DRY_RUN ? "would-update" : "updated"}=${updated} skipped=${batchSkipped}`,
    );

    startingAfter = commissions[commissions.length - 1].id;
    console.log(`last cursor: ${startingAfter}`);

    if (commissions.length < FETCH_BATCH_SIZE) {
      break;
    }

    await sleep(THROTTLE_MS);
  }

  console.log(
    `Finished. scanned=${totalScanned} ${DRY_RUN ? "would-update" : "updated"}=${totalUpdated} skipped=${totalSkipped}`,
  );
}

main();
