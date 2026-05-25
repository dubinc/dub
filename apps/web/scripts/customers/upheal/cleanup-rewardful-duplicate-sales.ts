import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { syncPartnerLinksStats } from "../../../lib/api/partners/sync-partner-links-stats";

// Dry run: set to false to actually delete
const DRY_RUN = true;
const programId = "prog_1KPAZMF49X9A1WEWRBM55KZY7";
const workspaceId = "ws_1KPAZ1MGF3VZH9HNMX048MW1X";
const CUSTOMER_SALES = [
  {
    customerId: "cus_1KR0SNVY4VP3XP7CBM5N4XMXP",
    linkId: "link_1KR0SMNWK9D4M13G6CM10925R",
    amount: 22800,
    eventId: "qCP2HOEFvn3IJZz2",
  },
];

async function main() {
  // 1. Delete Tinybird sale events (both raw datasource and MV)
  const eventIds = CUSTOMER_SALES.map((c) => c.eventId).filter(Boolean);
  if (eventIds.length > 0) {
    const condition = `event_id IN (${eventIds.map((id) => `'${id}'`).join(",")})`;
    console.log({ condition });
    const tbRes = await Promise.allSettled([
      deleteTinybirdData({ dataSource: "dub_sale_events", condition }),
      deleteTinybirdData({ dataSource: "dub_sale_events_mv", condition }),
    ]);
    console.log("\nTinybird deletion results:", tbRes);
  }

  // 3. Fix double-counted stats per customer and per link
  const statsByCustomer = CUSTOMER_SALES.reduce(
    (acc, c) => {
      if (!c.customerId) return acc;
      acc[c.customerId] ??= { sales: 0, saleAmount: 0 };
      acc[c.customerId].sales += 1;
      acc[c.customerId].saleAmount += c.amount;
      return acc;
    },
    {} as Record<string, { sales: number; saleAmount: number }>,
  );

  const statsByLink = CUSTOMER_SALES.reduce(
    (acc, c) => {
      if (!c.linkId) return acc;
      acc[c.linkId] ??= {
        sales: 0,
        saleAmount: 0,
      };
      acc[c.linkId].sales += 1;
      acc[c.linkId].saleAmount += c.amount;
      return acc;
    },
    {} as Record<string, { sales: number; saleAmount: number }>,
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

  const links = await prisma.link.findMany({
    where: {
      id: { in: Object.keys(statsByLink) },
    },
    select: {
      id: true,
      partnerId: true,
    },
  });
  // 4. Sync partner stats (link-level and total earnings)
  const partnerIds = [...new Set(links.map((l) => l.partnerId))] as string[];

  await Promise.all(
    partnerIds.map((partnerId) =>
      syncPartnerLinksStats({ partnerId, programId, eventType: "sale" }),
    ),
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
      body: `delete_condition=workspace_id='${workspaceId}' and ${condition}`,
    },
  ).then((res) => res.json());
}

main();
