import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { syncPartnerLinksStats } from "../../../lib/api/partners/sync-partner-links-stats";
import { syncTotalCommissions } from "../../../lib/api/partners/sync-total-commissions";

// Dry run: set to false to actually delete
const DRY_RUN = true;
const programId = "prog_xxx";

async function main() {
  // Rewardful-imported commissions use the Rewardful sale UUID as invoiceId (e.g. "4fc7004e-..."),
  // while the sync-stripe-invoices.ts script sets real Stripe invoice IDs (e.g. "in_1Ramt7...").
  // We find all commissions that do NOT have a Stripe invoice ID.
  const rewardfulCommissions = await prisma.commission.findMany({
    where: {
      programId,
      // Rewardful commissions store a Rewardful sale UUID as invoiceId (e.g. "4fc7004e-...").
      // We explicitly exclude null invoiceIds to avoid touching unrelated commissions.
      invoiceId: {
        not: null,
      },
      NOT: {
        invoiceId: {
          startsWith: "in_",
        },
      },
    },
    include: {
      customer: {
        include: {
          link: true,
        },
      },
    },
  });

  console.log(
    `Found ${rewardfulCommissions.length} Rewardful-imported commissions`,
  );

  // For each Rewardful commission, check if there is a corresponding sync commission
  // (same customer, same amount, Stripe invoiceId) — that's the duplicate we kept.
  const toDelete: typeof rewardfulCommissions = [];

  for (const rc of rewardfulCommissions) {
    const syncCommission = await prisma.commission.findFirst({
      where: {
        programId,
        customerId: rc.customerId,
        amount: rc.amount,
        invoiceId: {
          startsWith: "in_",
        },
      },
    });

    if (syncCommission) {
      toDelete.push(rc);
    } else {
      console.log(
        `No sync commission found for Rewardful commission ${rc.id} (customer ${rc.customerId}, amount ${rc.amount}). Skipping.`,
      );
    }
  }

  console.log(
    `\n${toDelete.length} Rewardful commissions have sync duplicates and will be cleaned up.`,
  );

  if (toDelete.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  console.table(
    toDelete.map((c) => ({
      commissionId: c.id,
      eventId: c.eventId,
      invoiceId: c.invoiceId,
      customerId: c.customerId,
      linkId: c.linkId,
      amount: c.amount,
    })),
  );

  if (DRY_RUN) {
    console.log("\nDRY RUN — no changes made. Set DRY_RUN=false to proceed.");
    return;
  }

  // 1. Delete Tinybird sale events (both raw datasource and MV)
  const eventIds = toDelete.map((c) => c.eventId).filter(Boolean);
  if (eventIds.length > 0) {
    const condition = `event_id IN (${eventIds.map((id) => `'${id}'`).join(",")})`;
    const tbRes = await Promise.allSettled([
      deleteTinybirdData({ dataSource: "dub_sale_events", condition }),
      deleteTinybirdData({ dataSource: "dub_sale_events_mv", condition }),
    ]);
    console.log("\nTinybird deletion results:", tbRes);
  }

  // 2. Delete Rewardful commissions from Prisma
  const deleted = await prisma.commission.deleteMany({
    where: {
      id: { in: toDelete.map((c) => c.id) },
    },
  });
  console.log(`\nDeleted ${deleted.count} commissions from Prisma`);

  // 3. Fix double-counted stats per customer and per link
  const statsByCustomer = toDelete.reduce(
    (acc, c) => {
      if (!c.customerId) return acc;
      acc[c.customerId] ??= { sales: 0, saleAmount: 0 };
      acc[c.customerId].sales += 1;
      acc[c.customerId].saleAmount += c.amount;
      return acc;
    },
    {} as Record<string, { sales: number; saleAmount: number }>,
  );

  const statsByLink = toDelete.reduce(
    (acc, c) => {
      if (!c.linkId) return acc;
      acc[c.linkId] ??= {
        sales: 0,
        saleAmount: 0,
        partnerId: null as string | null,
      };
      acc[c.linkId].sales += 1;
      acc[c.linkId].saleAmount += c.amount;
      acc[c.linkId].partnerId = c.customer?.link?.partnerId ?? null;
      return acc;
    },
    {} as Record<
      string,
      { sales: number; saleAmount: number; partnerId: string | null }
    >,
  );

  await Promise.all([
    ...Object.entries(statsByCustomer).map(([customerId, stats]) =>
      prisma.customer
        .update({
          where: { id: customerId },
          data: {
            sales: { decrement: stats.sales },
            saleAmount: { decrement: stats.saleAmount },
          },
        })
        .then((res) =>
          console.log(
            `Customer ${customerId}: sales=${res.sales}, saleAmount=${res.saleAmount}`,
          ),
        ),
    ),
    ...Object.entries(statsByLink).map(([linkId, stats]) =>
      prisma.link
        .update({
          where: { id: linkId },
          data: {
            sales: { decrement: stats.sales },
            saleAmount: { decrement: stats.saleAmount },
          },
        })
        .then((res) =>
          console.log(
            `Link ${linkId}: sales=${res.sales}, saleAmount=${res.saleAmount}`,
          ),
        ),
    ),
  ]);

  // 4. Sync partner stats (link-level and total earnings)
  const partnerIds = [
    ...new Set(
      Object.values(statsByLink)
        .map((s) => s.partnerId)
        .filter(Boolean),
    ),
  ] as string[];

  await Promise.all(
    partnerIds.flatMap((partnerId) => [
      syncPartnerLinksStats({ partnerId, programId, eventType: "sale" }),
      syncTotalCommissions({ partnerId, programId }),
    ]),
  );

  console.log("\nCleanup complete.");
}

async function deleteTinybirdData({
  dataSource,
  condition,
}: {
  dataSource: string;
  condition: string;
}) {
  return fetch(
    `https://api.us-east.tinybird.co/v0/datasources/${dataSource}/delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `delete_condition=${condition}`,
    },
  ).then((res) => res.json());
}

main();
