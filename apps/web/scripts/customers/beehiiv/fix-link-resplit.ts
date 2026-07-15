import { createId } from "@/lib/api/create-id";
import { retallyPayoutsAmount } from "@/lib/payouts/retally-payouts-amount";
import { prisma } from "@/lib/prisma";
import { chunk, groupBy } from "@dub/utils";
import { Link, Prisma } from "@prisma/client";
import "dotenv-flow/config";
import * as z from "zod/v4";
import { bulkCreateLinks } from "../../../lib/api/links/bulk-create-links";
import { syncTotalCommissions } from "../../../lib/api/partners/sync-total-commissions";
import { tb } from "../../../lib/tinybird/client";
import { getClickEvent } from "../../../lib/tinybird/get-click-event";
import { recordLeadWithTimestamp } from "../../../lib/tinybird/record-lead";
import { recordSaleWithTimestamp } from "../../../lib/tinybird/record-sale";

// re-split links whose customers were all attributed to a single partner, even though they were
// actually referred by multiple affiliates. The true affiliate is read from each imported sale
// event's Tinybird metadata (the original commission JSON -> `sale.affiliate`). Because the commission
// import didn't expand `affiliate`, that field is sometimes empty in the metadata even though the
// customer does have a referrer – so when TB shows no affiliate we fall back to LIVE Rewardful
// (/referrals by stripe id, then email) to recover the true affiliate. Per customer the script:
//   - moves the customer (+ commissions) onto a fresh dedicated link for the true affiliate,
//   - leaves them put if the true affiliate is already the source link's partner,
//   - detaches them only if neither TB nor Rewardful shows an affiliate, or the affiliate isn't an
//     enrolled Dub partner (unresolved-affiliate customers are logged so the affiliate can be
//     enrolled and the customers re-credited later).
// Overpayments already paid to the source link's partner are clawed back, and each customer's
// Tinybird click/lead/sale events are migrated (or deleted, when unattributed) inline. All affected
// links are handled in a single run – just list their IDs in SOURCE_LINK_IDS.
//
// Requires REWARDFUL_API_KEY in the environment (used for the no-affiliate fallback).

const DRY_RUN = false;
const PROGRAM_ID = "prog_xxx";
const SOURCE_LINK_IDS: string[] = [
  // "link_xxx"
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

const failedTbOps: { dataSource: string; condition: string }[] = [];

const REWARDFUL_BASE = "https://api.getrewardful.com/v1";
const REWARDFUL_DELAY_MS = 300;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// fallback used only when TB metadata has NO affiliate (the commission import dropped it): ask live
// Rewardful for the customer's referral affiliate, by stripe id then email. Read-only. Returns the
// affiliate (email/id) or null when Rewardful also shows no referrer.
async function resolveAffiliateFromRewardful(
  stripeCustomerId: string | null,
  email: string | null,
): Promise<SaleAffiliate | null> {
  const token = process.env.REWARDFUL_API_KEY!;
  const queries: string[] = [];
  if (stripeCustomerId) {
    queries.push(`stripe_customer_id=${encodeURIComponent(stripeCustomerId)}`);
  }
  if (email) {
    queries.push(`email=${encodeURIComponent(email)}`);
  }

  for (const query of queries) {
    await sleep(REWARDFUL_DELAY_MS);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let referrals: any[] = [];
    try {
      const res = await fetch(
        `${REWARDFUL_BASE}/referrals?${query}&expand[]=affiliate`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${token}:`).toString("base64")}`,
          },
          signal: controller.signal,
        },
      );
      if (!res.ok) {
        console.error(`Rewardful ${res.status} for ${query}`);
        continue;
      }
      const json = await res.json();
      referrals = json?.data ?? [];
    } catch (error) {
      console.error(`Rewardful lookup failed for ${query}:`, error);
      continue;
    } finally {
      clearTimeout(timeout);
    }

    const withAffiliate = referrals.find(
      (r) => r.affiliate && (r.affiliate.email || r.affiliate.id),
    );
    if (withAffiliate) {
      return {
        id: withAffiliate.affiliate.id,
        email: withAffiliate.affiliate.email,
      };
    }
  }

  return null;
}

// decide what to do with a resolved affiliate for a given source link
async function decideAffiliate(
  affiliate: SaleAffiliate,
  sourceLink: Link,
): Promise<
  | { type: "stay" }
  | { type: "move"; partnerId: string }
  | { type: "unresolved"; affiliate: string }
> {
  const partnerId = await resolvePartnerId(affiliate, sourceLink.domain);
  if (!partnerId) {
    return {
      type: "unresolved",
      affiliate: affiliate.email || affiliate.id || "unknown",
    };
  }
  if (partnerId === sourceLink.partnerId) {
    return { type: "stay" };
  }
  return { type: "move", partnerId };
}

async function tbDelete(dataSource: string, condition: string) {
  try {
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
      failedTbOps.push({ dataSource, condition });
    }
    console.log(
      `TB delete succeeded on "${dataSource}" for condition: ${condition}`,
    );
  } catch (error) {
    console.error(`TB delete threw on ${dataSource}:`, error);
    failedTbOps.push({ dataSource, condition });
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
    await tbDelete(
      "dub_sale_events",
      `customer_id='${customerId}' and link_id='${oldLinkId}'`,
    );
    await tbDelete(
      "dub_sale_events_mv",
      `customer_id='${customerId}' and link_id='${oldLinkId}'`,
    );
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
    await tbDelete(
      "dub_lead_events",
      `customer_id='${customerId}' and link_id='${oldLinkId}'`,
    );
    await tbDelete(
      "dub_lead_events_mv",
      `customer_id='${customerId}' and link_id='${oldLinkId}'`,
    );
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
      failedTbOps.push({
        dataSource: "dub_click_events (re-record)",
        condition: `click_id='${clickId}' -> link_id='${newLink.id}'`,
      });
      continue;
    }
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

  await tbDelete(
    "dub_sale_events",
    `customer_id='${customerId}' and link_id='${oldLinkId}'`,
  );
  await tbDelete(
    "dub_sale_events_mv",
    `customer_id='${customerId}' and link_id='${oldLinkId}'`,
  );
  await tbDelete(
    "dub_lead_events",
    `customer_id='${customerId}' and link_id='${oldLinkId}'`,
  );
  await tbDelete(
    "dub_lead_events_mv",
    `customer_id='${customerId}' and link_id='${oldLinkId}'`,
  );
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
  const newLinkKey = `${sourceLink.key}-${group.partnerId}`;
  let newLink: { id: string; key: string };
  if (DRY_RUN) {
    newLink = { id: `link_dryrun_${group.partnerId}`, key: newLinkKey };
    console.log(
      `[dry] would create link "${newLinkKey}" for partner ${group.partnerId}`,
    );
  } else {
    const [created] = await bulkCreateLinks({
      links: [
        {
          domain: sourceLink.domain!,
          key: newLinkKey,
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
    if (!created) {
      console.error(
        `Failed to create link for partner ${group.partnerId}, skipping group`,
      );
      return;
    }
    newLink = created;
    console.log(
      `Created link ${created.id} (${created.shortLink}) for partner ${group.partnerId}`,
    );
  }

  // move the customers to the new link / partner
  if (DRY_RUN) {
    console.log(
      `[dry] would move ${movedCount} customers (sales ${movedSales}, saleAmount ${movedSaleAmount}) to partner ${group.partnerId} / link ${newLink.key}`,
    );
  } else {
    while (true) {
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
        limit: 250,
      });
      console.log(
        `Updated ${updatedCustomers.count} customers to partner ${group.partnerId} / link ${newLink.id}`,
      );
      if (updatedCustomers.count < 250) {
        break;
      }
    }
  }

  // update non processed and non paid commissions (but include imported paid commissions) directly
  const nonProcessedWhere: Prisma.CommissionWhereInput = {
    customerId: { in: group.customerIds },
    linkId: sourceLink.id,
    OR: [
      { status: { in: ["pending", "canceled"] } },
      { status: "paid", payoutId: null },
    ],
  };
  if (DRY_RUN) {
    const count = await prisma.commission.count({ where: nonProcessedWhere });
    console.log(
      `[dry] would update ${count} non-processed commissions for partner ${group.partnerId}`,
    );
  } else {
    while (true) {
      const updatedCommissions = await prisma.commission.updateMany({
        where: nonProcessedWhere,
        data: {
          linkId: newLink.id,
          partnerId: group.partnerId,
        },
        limit: 250,
      });
      console.log(
        `Updated ${updatedCommissions.count} non-processed commissions for partner ${group.partnerId}`,
      );
      if (updatedCommissions.count < 250) {
        break;
      }
    }
  }

  const processedAndPaidWhere: Prisma.CommissionWhereInput = {
    customerId: { in: group.customerIds },
    linkId: sourceLink.id,
    status: { in: ["processed", "paid"] },
  };
  // update processed and paid commissions separately cause they're tied to a payout
  const processedAndPaidCommissions = await prisma.commission.findMany({
    where: processedAndPaidWhere,
  });
  console.log(
    `Found ${processedAndPaidCommissions.length} processed and paid commissions for partner ${group.partnerId}`,
  );

  if (DRY_RUN) {
    console.log(
      `[dry] would move ${processedAndPaidCommissions.length} processed/paid commissions to partner ${group.partnerId} (reset payout, status -> pending) and delete their activity logs`,
    );
  } else {
    while (true) {
      const updatedProcessedAndPaidCommissions =
        await prisma.commission.updateMany({
          where: processedAndPaidWhere,
          data: {
            linkId: newLink.id,
            partnerId: group.partnerId,
            payoutId: null,
            status: "pending",
          },
          limit: 250,
        });
      console.log(
        `Updated ${updatedProcessedAndPaidCommissions.count} processed and paid commissions for partner ${group.partnerId}`,
      );
      if (updatedProcessedAndPaidCommissions.count < 250) {
        break;
      }
    }

    const chunkedProcessedAndPaidCommissions = chunk(
      processedAndPaidCommissions,
      250,
    );
    for (const chunk of chunkedProcessedAndPaidCommissions) {
      // delete activity logs cause they'll be re-added to a new payout
      const deletedActivityLogs = await prisma.activityLog.deleteMany({
        where: {
          resourceType: "commission",
          resourceId: {
            in: chunk.map((commission) => commission.id),
          },
        },
      });
      console.log(
        `Deleted ${deletedActivityLogs.count} activity logs for commissions`,
      );
    }
  }

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

    if (DRY_RUN) {
      console.log(
        `[dry] would create overpayment + clawback of ${paidCommissionsTotal} for partner ${sourceLink.partnerId} (payout ${payoutId})`,
      );
      continue;
    }

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

  if (DRY_RUN) {
    console.log(
      `[dry] would retally ${payoutIdsToRetally.length} payout(s): ${payoutIdsToRetally.join(", ")}`,
    );
  } else {
    await retallyPayoutsAmount(payoutIdsToRetally);
  }

  // resync denormalized link counters: move the group's stats from source link to the new link
  if (DRY_RUN) {
    console.log(
      `[dry] would decrement source link ${sourceLink.id} and increment new link "${newLink.key}" by ${movedCount} clicks/leads/conversions, ${movedSales} sales, ${movedSaleAmount} saleAmount`,
    );
  } else {
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
  }

  if (DRY_RUN) {
    console.log(
      `[dry] would sync total commissions for partners ${sourceLink.partnerId} and ${group.partnerId}`,
    );
  } else {
    await syncTotalCommissions({
      partnerId: sourceLink.partnerId!,
      programId: PROGRAM_ID,
    });
    await syncTotalCommissions({
      partnerId: group.partnerId,
      programId: PROGRAM_ID,
    });
  }

  // migrate the moved customers' tinybird events onto the new link
  if (DRY_RUN) {
    console.log(
      `[dry] would migrate tinybird events for ${group.customerIds.length} customers to link "${newLink.key}"`,
    );
  } else {
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
  const nonProcessedWhere: Prisma.CommissionWhereInput = {
    customerId: { in: unattributeCustomerIds },
    linkId: sourceLink.id,
    OR: [
      { status: { in: ["pending", "canceled"] } },
      { status: "paid", payoutId: null },
    ],
  };
  if (DRY_RUN) {
    const count = await prisma.commission.count({ where: nonProcessedWhere });
    console.log(
      `[dry] would cancel ${count} non-processed commissions for unattributed customers`,
    );
  } else {
    while (true) {
      const canceledCommissions = await prisma.commission.updateMany({
        where: nonProcessedWhere,
        data: {
          status: "canceled",
        },
        limit: 250,
      });
      console.log(
        `Canceled ${canceledCommissions.count} non-processed commissions for unattributed customers`,
      );
      if (canceledCommissions.count < 250) {
        break;
      }
    }
  }

  const processedAndPaidWhere: Prisma.CommissionWhereInput = {
    customerId: { in: unattributeCustomerIds },
    linkId: sourceLink.id,
    status: { in: ["processed", "paid"] },
  };
  // processed and paid commissions are tied to a payout, handle separately
  const processedAndPaidCommissions = await prisma.commission.findMany({
    where: processedAndPaidWhere,
  });
  console.log(
    `Found ${processedAndPaidCommissions.length} processed and paid commissions for unattributed customers`,
  );

  if (DRY_RUN) {
    console.log(
      `[dry] would cancel ${processedAndPaidCommissions.length} processed/paid commissions (reset payout) and delete their activity logs`,
    );
  } else {
    while (true) {
      const updatedProcessedAndPaidCommissions =
        await prisma.commission.updateMany({
          where: processedAndPaidWhere,
          data: {
            payoutId: null,
            status: "canceled",
          },
          limit: 250,
        });
      console.log(
        `Updated ${updatedProcessedAndPaidCommissions.count} processed and paid commissions for unattributed customers`,
      );
      if (updatedProcessedAndPaidCommissions.count < 250) {
        break;
      }
    }

    const chunkedProcessedAndPaidCommissions = chunk(
      processedAndPaidCommissions,
      250,
    );
    for (const chunk of chunkedProcessedAndPaidCommissions) {
      // delete activity logs cause the commissions are no longer tied to a payout
      const deletedActivityLogs = await prisma.activityLog.deleteMany({
        where: {
          resourceType: "commission",
          resourceId: {
            in: chunk.map((commission) => commission.id),
          },
        },
      });
      console.log(
        `Deleted ${deletedActivityLogs.count} activity logs for commissions`,
      );
    }
  }

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

    if (DRY_RUN) {
      console.log(
        `[dry] would create overpayment + clawback of ${paidCommissionsTotal} for partner ${sourceLink.partnerId} (payout ${payoutId})`,
      );
      continue;
    }

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

  if (DRY_RUN) {
    console.log(
      `[dry] would retally ${payoutIdsToRetally.length} payout(s): ${payoutIdsToRetally.join(", ")}`,
    );
  } else {
    await retallyPayoutsAmount(payoutIdsToRetally);
  }

  // fully detach the customers – they belong to no partner/program/link
  if (DRY_RUN) {
    console.log(
      `[dry] would detach ${detachedCount} customers and decrement source link ${sourceLink.id} by ${detachedCount} clicks/leads/conversions, ${detachedSales} sales, ${detachedSaleAmount} saleAmount`,
    );
  } else {
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
  }

  if (DRY_RUN) {
    console.log(
      `[dry] would sync total commissions for partner ${sourceLink.partnerId}`,
    );
  } else {
    await syncTotalCommissions({
      partnerId: sourceLink.partnerId!,
      programId: PROGRAM_ID,
    });
  }

  // delete the detached customers' tinybird events on the source link
  if (DRY_RUN) {
    console.log(
      `[dry] would delete tinybird events for ${unattributeCustomerIds.length} unattributed customers on link ${sourceLink.id}`,
    );
  } else {
    for (const customerId of unattributeCustomerIds) {
      await deleteCustomerTbEvents({ customerId, oldLinkId: sourceLink.id });
    }
    console.log(
      `Deleted tinybird events for ${unattributeCustomerIds.length} unattributed customers`,
    );
  }
}

async function resplitLink(sourceLinkId: string) {
  const sourceLink = await prisma.link.findUniqueOrThrow({
    where: { id: sourceLinkId },
  });

  const customers = await prisma.customer.findMany({
    where: { linkId: sourceLinkId },
    select: { id: true, stripeCustomerId: true, email: true },
  });
  console.log(`Found ${customers.length} customers on link ${sourceLinkId}`);

  // classify every customer by their true affiliate
  const groupsMap = new Map<string, string[]>(); // partnerId -> customerIds
  const unattributeCustomerIds: string[] = [];
  let stayCount = 0;
  let noSaleCount = 0;
  let genuineNoAffiliateCount = 0;
  let rewardfulResolvedCount = 0;
  const noMetadata: string[] = [];
  // affiliate is named (in TB metadata or recovered from Rewardful) but isn't an enrolled Dub
  // partner: we unattribute these (so they don't stay credited to the wrong owner) and log the
  // intended affiliate for manual enrollment + re-credit later
  const unresolved: { customerId: string; affiliate: string }[] = [];
  // TB metadata had no affiliate – deferred to a sequential Rewardful fallback pass below
  const noAffiliatePending: {
    customerId: string;
    stripe: string | null;
    email: string | null;
  }[] = [];

  const applyDecision = (
    customerId: string,
    decision: Awaited<ReturnType<typeof decideAffiliate>>,
  ) => {
    if (decision.type === "stay") {
      stayCount++;
    } else if (decision.type === "unresolved") {
      unresolved.push({ customerId, affiliate: decision.affiliate });
      unattributeCustomerIds.push(customerId);
    } else {
      const existing = groupsMap.get(decision.partnerId);
      if (existing) existing.push(customerId);
      else groupsMap.set(decision.partnerId, [customerId]);
    }
  };

  // pass 1: TB metadata classification (concurrent – TB reads only)
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

          // TB metadata has no affiliate – the import may have dropped it; resolve via Rewardful next
          case "no-affiliate":
            noAffiliatePending.push({
              customerId: customer.id,
              stripe: customer.stripeCustomerId,
              email: customer.email,
            });
            return;

          case "affiliate":
            applyDecision(
              customer.id,
              await decideAffiliate(result.affiliate, sourceLink),
            );
            return;
        }
      }),
    );
  }

  // pass 2: for TB no-affiliate customers, fall back to LIVE Rewardful (sequential for rate limits)
  if (noAffiliatePending.length > 0) {
    console.log(
      `Resolving ${noAffiliatePending.length} no-affiliate customers via Rewardful fallback...`,
    );
    for (const pending of noAffiliatePending) {
      const affiliate = await resolveAffiliateFromRewardful(
        pending.stripe,
        pending.email,
      );
      if (!affiliate) {
        // neither TB nor Rewardful shows an affiliate – genuinely unattributed
        genuineNoAffiliateCount++;
        unattributeCustomerIds.push(pending.customerId);
        continue;
      }
      rewardfulResolvedCount++;
      applyDecision(
        pending.customerId,
        await decideAffiliate(affiliate, sourceLink),
      );
    }
  }

  const groups = [...groupsMap.entries()].map(([partnerId, customerIds]) => ({
    partnerId,
    customerIds,
  }));

  console.log(
    `Classified: ${groups.length} affiliate group(s) to move, ${stayCount} staying, ${unattributeCustomerIds.length} to unattribute (${genuineNoAffiliateCount} confirmed no-affiliate + ${unresolved.length} unresolved-affiliate), ${rewardfulResolvedCount} recovered via Rewardful fallback, ${noSaleCount} without a sale event, ${noMetadata.length} without import metadata (left in place)`,
  );
  if (noMetadata.length > 0) {
    console.log(
      `No-metadata customers (likely live-tracked, left in place) – review manually: ${noMetadata.join(", ")}`,
    );
  }
  if (unresolved.length > 0) {
    console.log(
      `Unattributed (${unresolved.length}) because the true affiliate is not an enrolled Dub partner – enroll the affiliate + re-credit these customers later:`,
    );
    for (const u of unresolved) {
      console.log(`  ${u.customerId} (affiliate: ${u.affiliate})`);
    }
  }

  for (const group of groups) {
    await moveGroup({ sourceLink, group });
  }

  if (unattributeCustomerIds.length > 0) {
    await unattributeCustomers({ sourceLink, unattributeCustomerIds });
  }
}

async function main() {
  if (!process.env.REWARDFUL_API_KEY) {
    throw new Error(
      "Set REWARDFUL_API_KEY in the environment (used for the no-affiliate Rewardful fallback).",
    );
  }
  console.log(
    DRY_RUN
      ? "DRY RUN – no changes will be written (set DRY_RUN = false to apply)"
      : "LIVE RUN – changes will be written",
  );
  const failedLinks: { sourceLinkId: string; error: unknown }[] = [];
  for (const sourceLinkId of SOURCE_LINK_IDS) {
    console.log(`\n=== Re-splitting link ${sourceLinkId} ===`);
    try {
      await resplitLink(sourceLinkId);
    } catch (error) {
      console.error(`Failed to re-split link ${sourceLinkId}:`, error);
      failedLinks.push({ sourceLinkId, error });
    }
  }

  if (failedLinks.length > 0) {
    console.log(
      `\n=== ${failedLinks.length} FAILED link(s) - may be partially applied, review before re-running ===`,
    );
    for (const { sourceLinkId, error } of failedLinks) {
      console.log(
        `  ${sourceLinkId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (failedTbOps.length > 0) {
    console.log(
      `\n=== ${failedTbOps.length} FAILED Tinybird operation(s) – re-run manually ===`,
    );
    for (const op of failedTbOps) {
      console.log(`  ${op.dataSource} WHERE ${op.condition}`);
    }
  } else {
    console.log("\nAll Tinybird operations succeeded (no failed deletes).");
  }
}

main();
