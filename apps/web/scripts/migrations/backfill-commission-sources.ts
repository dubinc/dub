import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";
import { tb } from "@/lib/tinybird/client";
import { chunk, pluck, sleep } from "@dub/utils";
import {
  SHOPIFY_INTEGRATION_ID,
  STRIPE_INTEGRATION_ID,
} from "@dub/utils/src/constants/integrations";
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function identifySaleSource(raw: string): CommissionSource | null {
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
    isPlainObject(parsed.invoice) &&
    parsed.invoice.object === "invoice" &&
    "lines" in parsed.invoice &&
    "amount_due" in parsed.invoice &&
    "customer" in parsed.invoice &&
    "hosted_invoice_url" in parsed.invoice
  ) {
    return CommissionSource.stripe;
  }

  if (
    isPlainObject(parsed.checkoutSession) &&
    parsed.checkoutSession.object === "checkout.session" &&
    "mode" in parsed.checkoutSession &&
    "payment_status" in parsed.checkoutSession &&
    "amount_total" in parsed.checkoutSession &&
    "success_url" in parsed.checkoutSession
  ) {
    return CommissionSource.stripe;
  }

  if (
    "checkout_token" in parsed &&
    "confirmation_number" in parsed &&
    "discount_codes" in parsed &&
    "note_attributes" in parsed &&
    isPlainObject(parsed.current_subtotal_price_set) &&
    isPlainObject(parsed.current_subtotal_price_set.shop_money) &&
    "amount" in parsed.current_subtotal_price_set.shop_money &&
    "currency_code" in parsed.current_subtotal_price_set.shop_money
  ) {
    return CommissionSource.shopify;
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
  const installedIntegrations = await prisma.installedIntegration.findMany({
    where: {
      integrationId: {
        in: [SHOPIFY_INTEGRATION_ID, STRIPE_INTEGRATION_ID],
      },
      project: {
        defaultProgramId: {
          not: null,
        },
      },
    },
    select: {
      projectId: true,
    },
  });

  const workspaceIds = pluck(installedIntegrations, "projectId");

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
        program: {
          workspace: {
            id: {
              in: workspaceIds,
            },
          },
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

      const source = identifySaleSource(raw);

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
