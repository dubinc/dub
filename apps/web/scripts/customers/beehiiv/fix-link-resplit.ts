import { createId } from "@/lib/api/create-id";
import { retallyPayoutsAmount } from "@/lib/payouts/retally-payouts-amount";
import { prisma } from "@/lib/prisma";
import { chunk, groupBy } from "@dub/utils";
import { Link } from "@prisma/client";
import "dotenv-flow/config";
import * as z from "zod/v4";
import { bulkCreateLinks } from "../../../lib/api/links/bulk-create-links";
import { syncTotalCommissions } from "../../../lib/api/partners/sync-total-commissions";
import { tb } from "../../../lib/tinybird/client";
import { getClickEvent } from "../../../lib/tinybird/get-click-event";
import { recordLeadWithTimestamp } from "../../../lib/tinybird/record-lead";
import { recordSaleWithTimestamp } from "../../../lib/tinybird/record-sale";

// re-split links whose customers were all attributed to a single partner, even though they were
// actually referred by multiple affiliates. The true affiliate is recorded in each imported sale
// event's Tinybird metadata (the original commission JSON -> `sale.affiliate`). For every customer on
// a source link the script reads that affiliate, resolves it to a Dub partner, and:
//   - moves the customer (+ commissions) onto a fresh dedicated link for the true affiliate,
//   - leaves them put if the true affiliate is already the source link's partner,
//   - detaches them if the sale has no affiliate at all (no partner earns for them).
// Overpayments already paid to the source link's partner are clawed back, and each customer's
// Tinybird click/lead/sale events are migrated (or deleted, when unattributed) inline. All affected
// links are handled in a single run – just list their IDs in SOURCE_LINK_IDS.

const PROGRAM_ID = "prog_xxx";

// the links to re-split (filled with the affected link IDs)
const SOURCE_LINK_IDS: string[] = [
  // "link_xxx",
];

const getSaleEvents = tb.buildPipe({
  pipe: "internal_get_sale_events",
  parameters: z.object({ customerId: z.string() }),
  data: z.any(),
});

const getLeadEvents = tb.buildPipe({
  pipe: "internal_get_lead_events",
  parameters: z.object({ customerId: z.string() }),
  data: z.any(),
});

type SaleAffiliate = {
  id?: string;
  email?: string;
  links?: { token?: string }[];
};

// affiliate identifier -> resolved Dub partnerId (null = unresolvable), cached across the whole run
const partnerIdCache = new Map<string, string | null>();

async function tbDelete(dataSource: string, condition: string) {
  const res = await fetch(
    `https://api.us-east.tinybird.co/v0/datasources/${dataSource}/delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `delete_condition=${condition}`,
    },
  );
  if (!res.ok) {
    console.error(`TB delete failed on ${dataSource} (${res.status})`);
  }
}

// migrate a customer's click/lead/sale events off the old link onto the new link
async function moveCustomerTbEvents({
  customerId,
  oldLinkId,
  newLink,
}: {
  customerId: string;
  oldLinkId: string;
  newLink: { id: string; key: string };
}) {
  const clickIds = new Set<string>();

  const { data: saleData } = await getSaleEvents({ customerId });
  const salesToMove = (saleData as any[]).filter(
    (event) => event.link_id === oldLinkId,
  );
  if (salesToMove.length > 0) {
    const updated = salesToMove.map((event) => {
      if (event.click_id) clickIds.add(event.click_id);
      return { ...event, link_id: newLink.id, key: newLink.key };
    });
    await recordSaleWithTimestamp(updated);
    await Promise.allSettled([
      tbDelete(
        "dub_sale_events",
        `customer_id='${customerId}' and link_id='${oldLinkId}'`,
      ),
      tbDelete(
        "dub_sale_events_mv",
        `customer_id='${customerId}' and link_id='${oldLinkId}'`,
      ),
    ]);
  }

  const { data: leadData } = await getLeadEvents({ customerId });
  const leadsToMove = (leadData as any[]).filter(
    (event) => event.link_id === oldLinkId,
  );
  if (leadsToMove.length > 0) {
    for (const lead of leadsToMove) {
      if (lead.click_id) clickIds.add(lead.click_id);
      await recordLeadWithTimestamp({
        ...lead,
        link_id: newLink.id,
        key: newLink.key,
      });
    }
    await Promise.allSettled([
      tbDelete(
        "dub_lead_events",
        `customer_id='${customerId}' and link_id='${oldLinkId}'`,
      ),
      tbDelete(
        "dub_lead_events_mv",
        `customer_id='${customerId}' and link_id='${oldLinkId}'`,
      ),
    ]);
  }

  for (const clickId of clickIds) {
    const clickData = await getClickEvent({ clickId });
    if (!clickData || clickData.link_id !== oldLinkId) continue;
    const res = await fetch(
      `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_click_events&wait=true`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}` },
        body: JSON.stringify({
          ...clickData,
          vercel_region: "iad1",
          link_id: newLink.id,
        }),
      },
    );
    if (!res.ok) {
      console.error(`Failed to re-record click ${clickId} (${res.status})`);
      continue;
    }
    await Promise.allSettled([
      tbDelete(
        "dub_click_events_mv",
        `click_id='${clickId}' and link_id='${oldLinkId}'`,
      ),
      tbDelete(
        "dub_click_events_id",
        `click_id='${clickId}' and link_id='${oldLinkId}'`,
      ),
    ]);
  }
}

// delete a customer's click/lead/sale events on the old link (used when the customer is detached)
async function deleteCustomerTbEvents({
  customerId,
  oldLinkId,
}: {
  customerId: string;
  oldLinkId: string;
}) {
  const clickIds = new Set<string>();
  const { data: saleData } = await getSaleEvents({ customerId });
  for (const event of (saleData as any[]).filter(
    (event) => event.link_id === oldLinkId,
  )) {
    if (event.click_id) clickIds.add(event.click_id);
  }
  const { data: leadData } = await getLeadEvents({ customerId });
  for (const event of (leadData as any[]).filter(
    (event) => event.link_id === oldLinkId,
  )) {
    if (event.click_id) clickIds.add(event.click_id);
  }

  await Promise.allSettled([
    tbDelete(
      "dub_sale_events",
      `customer_id='${customerId}' and link_id='${oldLinkId}'`,
    ),
    tbDelete(
      "dub_sale_events_mv",
      `customer_id='${customerId}' and link_id='${oldLinkId}'`,
    ),
    tbDelete(
      "dub_lead_events",
      `customer_id='${customerId}' and link_id='${oldLinkId}'`,
    ),
    tbDelete(
      "dub_lead_events_mv",
      `customer_id='${customerId}' and link_id='${oldLinkId}'`,
    ),
  ]);
  for (const clickId of clickIds) {
    await Promise.allSettled([
      tbDelete(
        "dub_click_events_mv",
        `click_id='${clickId}' and link_id='${oldLinkId}'`,
      ),
      tbDelete(
        "dub_click_events_id",
        `click_id='${clickId}' and link_id='${oldLinkId}'`,
      ),
    ]);
  }
}

async function main() {
  for (const sourceLinkId of SOURCE_LINK_IDS) {
    console.log(`\n=== Re-splitting link ${sourceLinkId} ===`);
    await resplitLink(sourceLinkId);
  }
}

// classify a customer by reading the true affiliate from their imported sale events' metadata:
//   - "no-sale": no sale event to derive from -> leave in place
//   - "no-metadata": sale(s) exist but none carry parseable import metadata (likely a live-tracked
//     Dub sale, not an import) -> leave in place + flag for manual review
//   - "no-affiliate": import metadata parsed but the commission has no affiliate -> unattribute
//   - "affiliate": the resolved referring affiliate
type AffiliateResult =
  | { kind: "no-sale" }
  | { kind: "no-metadata" }
  | { kind: "no-affiliate" }
  | { kind: "affiliate"; affiliate: SaleAffiliate };

async function getSaleAffiliate(customerId: string): Promise<AffiliateResult> {
  const { data } = await getSaleEvents({ customerId });
  if (!data || data.length === 0) {
    return { kind: "no-sale" };
  }

  // only treat a customer as "no-affiliate" (unattribute) when we positively parsed an import
  // commission that lacks an affiliate – otherwise it's ambiguous and we leave them in place
  let parsedImportCommission = false;

  for (const event of data as any[]) {
    if (!event.metadata) continue;
    try {
      const commission = JSON.parse(event.metadata);
      parsedImportCommission = true;
      const affiliate = commission?.sale?.affiliate;
      if (affiliate && (affiliate.email || affiliate.id)) {
        return { kind: "affiliate", affiliate: affiliate as SaleAffiliate };
      }
    } catch {
      // ignore malformed metadata
    }
  }

  return parsedImportCommission
    ? { kind: "no-affiliate" }
    : { kind: "no-metadata" };
}

// resolve a sale affiliate to a Dub partner enrolled in the program: first via the affiliate's link
// token (its Dub link key), then by partner email
async function resolvePartnerId(
  affiliate: SaleAffiliate,
  domain: string,
): Promise<string | null> {
  const cacheKey = affiliate.id || affiliate.email || "";
  if (cacheKey && partnerIdCache.has(cacheKey)) {
    return partnerIdCache.get(cacheKey)!;
  }

  let partnerId: string | null = null;

  for (const link of affiliate.links ?? []) {
    if (!link.token) continue;
    const dubLink = await prisma.link.findFirst({
      where: { domain, key: link.token, programId: PROGRAM_ID },
      select: { partnerId: true },
    });
    if (dubLink?.partnerId) {
      partnerId = dubLink.partnerId;
      break;
    }
  }

  if (!partnerId && affiliate.email) {
    const enrollment = await prisma.programEnrollment.findFirst({
      where: { programId: PROGRAM_ID, partner: { email: affiliate.email } },
      select: { partnerId: true },
    });
    partnerId = enrollment?.partnerId ?? null;
  }

  if (cacheKey) {
    partnerIdCache.set(cacheKey, partnerId);
  }
  return partnerId;
}

async function resplitLink(sourceLinkId: string) {
  const sourceLink = await prisma.link.findUniqueOrThrow({
    where: { id: sourceLinkId },
  });

  const customers = await prisma.customer.findMany({
    where: { linkId: sourceLinkId },
    select: { id: true },
  });
  console.log(`Found ${customers.length} customers on link ${sourceLinkId}`);

  // classify every customer by their true affiliate
  const groupsMap = new Map<string, string[]>(); // partnerId -> customerIds
  const unattributeCustomerIds: string[] = [];
  let stayCount = 0;
  let noSaleCount = 0;
  const noMetadata: string[] = [];
  const unresolved: string[] = [];

  for (const batch of chunk(customers, 20)) {
    await Promise.all(
      batch.map(async (customer) => {
        const result = await getSaleAffiliate(customer.id);

        switch (result.kind) {
          // no sale event to derive from – leave the customer where they are
          case "no-sale":
            noSaleCount++;
            return;

          // sale(s) exist but no import metadata (likely live-tracked) – leave in place + review
          case "no-metadata":
            noMetadata.push(customer.id);
            return;

          // import commission with no referring affiliate – nobody earns for this customer
          case "no-affiliate":
            unattributeCustomerIds.push(customer.id);
            return;

          case "affiliate": {
            const partnerId = await resolvePartnerId(
              result.affiliate,
              sourceLink.domain,
            );
            if (!partnerId) {
              unresolved.push(customer.id);
              return;
            }

            // already attributed to the true affiliate – nothing to do
            if (partnerId === sourceLink.partnerId) {
              stayCount++;
              return;
            }

            const existing = groupsMap.get(partnerId);
            if (existing) {
              existing.push(customer.id);
            } else {
              groupsMap.set(partnerId, [customer.id]);
            }
            return;
          }
        }
      }),
    );
  }

  const groups = [...groupsMap.entries()].map(([partnerId, customerIds]) => ({
    partnerId,
    customerIds,
  }));

  console.log(
    `Classified: ${groups.length} affiliate group(s) to move, ${unattributeCustomerIds.length} to unattribute, ${stayCount} staying, ${noSaleCount} without a sale event, ${noMetadata.length} without import metadata (left in place), ${unresolved.length} unresolved`,
  );
  if (noMetadata.length > 0) {
    console.log(
      `No-metadata customers (likely live-tracked, left in place) – review manually: ${noMetadata.join(", ")}`,
    );
  }
  if (unresolved.length > 0) {
    console.log(
      `Unresolved customers (affiliate found but no matching Dub partner) – review manually: ${unresolved.join(", ")}`,
    );
  }

  for (const group of groups) {
    await moveGroup({ sourceLink, group });
  }

  if (unattributeCustomerIds.length > 0) {
    await unattributeCustomers({ sourceLink, unattributeCustomerIds });
  }
}

async function moveGroup({
  sourceLink,
  group,
}: {
  sourceLink: Link;
  group: { partnerId: string; customerIds: string[] };
}) {
  // aggregate the group's current stats before moving anything (for the link stat resync)
  const stats = await prisma.customer.aggregate({
    where: {
      id: { in: group.customerIds },
      linkId: sourceLink.id,
    },
    _count: { id: true },
    _sum: { sales: true, saleAmount: true },
  });
  const movedCount = stats._count.id;
  const movedSales = stats._sum.sales ?? 0;
  const movedSaleAmount = stats._sum.saleAmount ?? BigInt(0);

  if (movedCount === 0) {
    console.log(
      `No customers to move for partner ${group.partnerId} on link ${sourceLink.id}`,
    );
    return;
  }

  // create a fresh dedicated link for the true affiliate
  const [newLink] = await bulkCreateLinks({
    links: [
      {
        domain: sourceLink.domain!,
        key: `${sourceLink.key}-${group.partnerId}`,
        url: sourceLink.url!,
        trackConversion: true,
        programId: PROGRAM_ID,
        partnerId: group.partnerId,
        folderId: sourceLink.folderId,
        userId: sourceLink.userId,
        projectId: sourceLink.projectId,
        comments: `Re-split from source link ${sourceLink.id}`,
      },
    ],
    skipRedisCache: true,
  });
  if (!newLink) {
    console.error(
      `Failed to create link for partner ${group.partnerId}, skipping group`,
    );
    return;
  }
  console.log(
    `Created link ${newLink.id} (${newLink.shortLink}) for partner ${group.partnerId}`,
  );

  // move the customers to the new link / partner
  const updatedCustomers = await prisma.customer.updateMany({
    where: {
      id: { in: group.customerIds },
      linkId: sourceLink.id,
    },
    data: {
      linkId: newLink.id,
      partnerId: group.partnerId,
      programId: PROGRAM_ID,
    },
  });
  console.log(
    `Updated ${updatedCustomers.count} customers to partner ${group.partnerId} / link ${newLink.id}`,
  );

  // update non processed and non paid commissions (but include imported paid commissions) directly
  const updatedCommissions = await prisma.commission.updateMany({
    where: {
      customerId: { in: group.customerIds },
      OR: [
        { status: { in: ["pending", "canceled"] } },
        { status: "paid", payoutId: null },
      ],
    },
    data: {
      linkId: newLink.id,
      partnerId: group.partnerId,
    },
  });
  console.log(
    `Updated ${updatedCommissions.count} non-processed commissions for partner ${group.partnerId}`,
  );

  // update processed and paid commissions separately cause they're tied to a payout
  const processedAndPaidCommissions = await prisma.commission.findMany({
    where: {
      customerId: { in: group.customerIds },
      linkId: sourceLink.id,
      status: { in: ["processed", "paid"] },
    },
  });
  console.log(
    `Found ${processedAndPaidCommissions.length} processed and paid commissions for partner ${group.partnerId}`,
  );

  const updatedProcessedAndPaidCommissions = await prisma.commission.updateMany(
    {
      where: {
        id: {
          in: processedAndPaidCommissions.map((commission) => commission.id),
        },
      },
      data: {
        partnerId: group.partnerId,
        payoutId: null,
        status: "pending",
      },
    },
  );
  console.log(
    `Updated ${updatedProcessedAndPaidCommissions.count} processed and paid commissions for partner ${group.partnerId}`,
  );

  // delete activity logs cause they'll be re-added to a new payout
  const deletedActivityLogs = await prisma.activityLog.deleteMany({
    where: {
      resourceType: "commission",
      resourceId: {
        in: processedAndPaidCommissions.map((commission) => commission.id),
      },
    },
  });
  console.log(
    `Deleted ${deletedActivityLogs.count} activity logs for commissions`,
  );

  // the source link's partner was credited + paid for these customers, so for any commissions
  // already paid via Dub we create a dummy commission to represent the overpayment + a clawback to
  // balance the books
  const paidCommissionsViaDub = processedAndPaidCommissions.filter(
    (commission) =>
      commission.status === "paid" && commission.payoutId !== null,
  );
  const groupedByPayoutId = groupBy(
    paidCommissionsViaDub,
    (commission) => commission.payoutId!,
  );

  for (const payoutId of Object.keys(groupedByPayoutId)) {
    const paidCommissionsTotal = groupedByPayoutId[payoutId].reduce(
      (acc, commission) => acc + commission.earnings,
      0,
    );
    console.log(
      `Total paid commissions for payout ${payoutId}: ${paidCommissionsTotal}`,
    );

    const createdCommission = await prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        type: "custom",
        partnerId: sourceLink.partnerId!,
        programId: PROGRAM_ID,
        description: `Overpayment for payout ${payoutId}`,
        earnings: paidCommissionsTotal,
        payoutId,
        amount: 0,
        quantity: 1,
        userId: sourceLink.userId,
        status: "paid",
      },
    });
    console.log(
      `Created dummy commission ${createdCommission.id} for overpayment of ${paidCommissionsTotal} for payout ${payoutId}`,
    );

    const createdClawback = await prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        type: "custom",
        partnerId: sourceLink.partnerId!,
        programId: PROGRAM_ID,
        description: `Clawback for commission "${createdCommission.id}" (re-split of source link ${sourceLink.id})`,
        earnings: -paidCommissionsTotal,
        amount: 0,
        quantity: 1,
        userId: sourceLink.userId,
      },
    });
    console.log(
      `Created clawback ${createdClawback.id} for ${paidCommissionsTotal} paid commissions for partner ${sourceLink.partnerId}`,
    );
  }

  // retally old payout ID values for processed commissions
  const processedCommissions = processedAndPaidCommissions.filter(
    (commission) => commission.status === "processed",
  );
  const payoutIdsToRetally = [
    ...new Set(
      processedCommissions
        .map((commission) => commission.payoutId!)
        .filter((payoutId): payoutId is string => Boolean(payoutId)),
    ),
  ];

  await retallyPayoutsAmount(payoutIdsToRetally);

  // resync denormalized link counters: move the group's stats from source link to the new link
  const updatedSourceLink = await prisma.link.update({
    where: { id: sourceLink.id },
    data: {
      clicks: { decrement: movedCount },
      leads: { decrement: movedCount },
      conversions: { decrement: movedCount },
      sales: { decrement: movedSales },
      saleAmount: { decrement: movedSaleAmount },
    },
  });
  console.log(
    `Decremented source link ${sourceLink.id}: ${updatedSourceLink.clicks} clicks, ${updatedSourceLink.leads} leads, ${updatedSourceLink.conversions} conversions, ${updatedSourceLink.sales} sales, ${updatedSourceLink.saleAmount} saleAmount`,
  );

  const updatedNewLink = await prisma.link.update({
    where: { id: newLink.id },
    data: {
      clicks: { increment: movedCount },
      leads: { increment: movedCount },
      conversions: { increment: movedCount },
      sales: { increment: movedSales },
      saleAmount: { increment: movedSaleAmount },
    },
  });
  console.log(
    `Incremented new link ${newLink.id}: ${updatedNewLink.clicks} clicks, ${updatedNewLink.leads} leads, ${updatedNewLink.conversions} conversions, ${updatedNewLink.sales} sales, ${updatedNewLink.saleAmount} saleAmount`,
  );

  await syncTotalCommissions({
    partnerId: sourceLink.partnerId!,
    programId: PROGRAM_ID,
  });
  await syncTotalCommissions({
    partnerId: group.partnerId,
    programId: PROGRAM_ID,
  });

  // migrate the moved customers' tinybird events onto the new link
  for (const customerId of group.customerIds) {
    await moveCustomerTbEvents({
      customerId,
      oldLinkId: sourceLink.id,
      newLink,
    });
  }
  console.log(
    `Migrated tinybird events for ${group.customerIds.length} customers to link ${newLink.id}`,
  );
}

// these customers had no referring affiliate, so nobody earns for them – detach the customers,
// cancel their commissions, and claw back any overpayment from the source link's partner
async function unattributeCustomers({
  sourceLink,
  unattributeCustomerIds,
}: {
  sourceLink: Link;
  unattributeCustomerIds: string[];
}) {
  const stats = await prisma.customer.aggregate({
    where: {
      id: { in: unattributeCustomerIds },
      linkId: sourceLink.id,
    },
    _count: { id: true },
    _sum: { sales: true, saleAmount: true },
  });
  const detachedCount = stats._count.id;
  const detachedSales = stats._sum.sales ?? 0;
  const detachedSaleAmount = stats._sum.saleAmount ?? BigInt(0);

  if (detachedCount === 0) {
    console.log(`No customers to unattribute on link ${sourceLink.id}`);
    return;
  }

  // cancel non processed and non paid commissions (including imported paid) – nobody earns these
  const canceledCommissions = await prisma.commission.updateMany({
    where: {
      customerId: { in: unattributeCustomerIds },
      OR: [
        { status: { in: ["pending", "canceled"] } },
        { status: "paid", payoutId: null },
      ],
    },
    data: {
      status: "canceled",
    },
  });
  console.log(
    `Canceled ${canceledCommissions.count} non-processed commissions for unattributed customers`,
  );

  // processed and paid commissions are tied to a payout, handle separately
  const processedAndPaidCommissions = await prisma.commission.findMany({
    where: {
      customerId: { in: unattributeCustomerIds },
      linkId: sourceLink.id,
      status: { in: ["processed", "paid"] },
    },
  });
  console.log(
    `Found ${processedAndPaidCommissions.length} processed and paid commissions for unattributed customers`,
  );

  const updatedProcessedAndPaidCommissions = await prisma.commission.updateMany(
    {
      where: {
        id: {
          in: processedAndPaidCommissions.map((commission) => commission.id),
        },
      },
      data: {
        payoutId: null,
        status: "canceled",
      },
    },
  );
  console.log(
    `Canceled ${updatedProcessedAndPaidCommissions.count} processed and paid commissions for unattributed customers`,
  );

  // delete activity logs cause the commissions are no longer tied to a payout
  const deletedActivityLogs = await prisma.activityLog.deleteMany({
    where: {
      resourceType: "commission",
      resourceId: {
        in: processedAndPaidCommissions.map((commission) => commission.id),
      },
    },
  });
  console.log(
    `Deleted ${deletedActivityLogs.count} activity logs for commissions`,
  );

  // for any commissions already paid via Dub, create a dummy commission to represent the overpayment
  // + a clawback to balance the source partner's books
  const paidCommissionsViaDub = processedAndPaidCommissions.filter(
    (commission) =>
      commission.status === "paid" && commission.payoutId !== null,
  );
  const groupedByPayoutId = groupBy(
    paidCommissionsViaDub,
    (commission) => commission.payoutId!,
  );

  for (const payoutId of Object.keys(groupedByPayoutId)) {
    const paidCommissionsTotal = groupedByPayoutId[payoutId].reduce(
      (acc, commission) => acc + commission.earnings,
      0,
    );
    console.log(
      `Total paid commissions for payout ${payoutId}: ${paidCommissionsTotal}`,
    );

    const createdCommission = await prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        type: "custom",
        partnerId: sourceLink.partnerId!,
        programId: PROGRAM_ID,
        description: `Overpayment for payout ${payoutId}`,
        earnings: paidCommissionsTotal,
        payoutId,
        amount: 0,
        quantity: 1,
        userId: sourceLink.userId,
        status: "paid",
      },
    });
    console.log(
      `Created dummy commission ${createdCommission.id} for overpayment of ${paidCommissionsTotal} for payout ${payoutId}`,
    );

    const createdClawback = await prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        type: "custom",
        partnerId: sourceLink.partnerId!,
        programId: PROGRAM_ID,
        description: `Clawback for commission "${createdCommission.id}" (unattributed sales on source link ${sourceLink.id})`,
        earnings: -paidCommissionsTotal,
        amount: 0,
        quantity: 1,
        userId: sourceLink.userId,
      },
    });
    console.log(
      `Created clawback ${createdClawback.id} for ${paidCommissionsTotal} paid commissions for partner ${sourceLink.partnerId}`,
    );
  }

  // retally old payout ID values for processed commissions
  const processedCommissions = processedAndPaidCommissions.filter(
    (commission) => commission.status === "processed",
  );
  const payoutIdsToRetally = [
    ...new Set(
      processedCommissions
        .map((commission) => commission.payoutId!)
        .filter((payoutId): payoutId is string => Boolean(payoutId)),
    ),
  ];

  await retallyPayoutsAmount(payoutIdsToRetally);

  // fully detach the customers – they belong to no partner/program/link
  const updatedCustomers = await prisma.customer.updateMany({
    where: {
      id: { in: unattributeCustomerIds },
      linkId: sourceLink.id,
    },
    data: {
      linkId: null,
      partnerId: null,
      programId: null,
    },
  });
  console.log(`Detached ${updatedCustomers.count} customers`);

  // resync denormalized link counters: remove the detached customers' stats from the source link
  const updatedSourceLink = await prisma.link.update({
    where: { id: sourceLink.id },
    data: {
      clicks: { decrement: detachedCount },
      leads: { decrement: detachedCount },
      conversions: { decrement: detachedCount },
      sales: { decrement: detachedSales },
      saleAmount: { decrement: detachedSaleAmount },
    },
  });
  console.log(
    `Decremented source link ${sourceLink.id}: ${updatedSourceLink.clicks} clicks, ${updatedSourceLink.leads} leads, ${updatedSourceLink.conversions} conversions, ${updatedSourceLink.sales} sales, ${updatedSourceLink.saleAmount} saleAmount`,
  );

  await syncTotalCommissions({
    partnerId: sourceLink.partnerId!,
    programId: PROGRAM_ID,
  });

  // delete the detached customers' tinybird events on the source link
  for (const customerId of unattributeCustomerIds) {
    await deleteCustomerTbEvents({ customerId, oldLinkId: sourceLink.id });
  }
  console.log(
    `Deleted tinybird events for ${unattributeCustomerIds.length} unattributed customers`,
  );
}

main();
