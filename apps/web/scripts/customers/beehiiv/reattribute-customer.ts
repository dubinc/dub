import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { MUTABLE_PAYOUT_STATUSES } from "@/lib/constants/payouts";
import { retallyPayoutsAmount } from "@/lib/payouts/retally-payouts-amount";
import { prisma } from "@/lib/prisma";
import { tb } from "@/lib/tinybird/client";
import { recordLeadWithTimestamp } from "@/lib/tinybird/record-lead";
import { recordSaleWithTimestamp } from "@/lib/tinybird/record-sale";
import "dotenv-flow/config";
import * as z from "zod/v4";
import { getSaleEvents } from "../../tinybird/get-sale-events";

/**
 * One-off: reattribute a beehiiv customer from one partner to another.
 *
 * Dry run (default): p script customers/beehiiv/reattribute-customer
 * Execute: set DRY_RUN = false below, then re-run.
 */

const DRY_RUN = true;

const PROGRAM_ID = "prog_xxx";
const CUSTOMER_ID = "cus_xxx";
const OLD_PARTNER_ID = "pn_xxx";
const NEW_PARTNER_ID = "pn_xxx";
const OLD_LINK_ID = "link_xxx";
const NEW_LINK_ID = "link_xxx";
const PAYOUT_ID = "po_xxx";

const getLeadEvents = tb.buildPipe({
  pipe: "internal_get_lead_events",
  parameters: z.object({
    customerId: z.string(),
  }),
  data: z.any(),
});

async function deleteTinybirdRows({
  dataSource,
  customerId,
  oldLinkId,
}: {
  dataSource: string;
  customerId: string;
  oldLinkId: string;
}) {
  return fetch(
    `https://api.us-east.tinybird.co/v0/datasources/${dataSource}/delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `delete_condition=customer_id='${customerId}' and link_id='${oldLinkId}'`,
    },
  ).then((res) => res.json());
}

async function main() {
  const [customer, oldLink, newLink, payout, commissions] = await Promise.all([
    prisma.customer.findUniqueOrThrow({ where: { id: CUSTOMER_ID } }),
    prisma.link.findUniqueOrThrow({ where: { id: OLD_LINK_ID } }),
    prisma.link.findUniqueOrThrow({ where: { id: NEW_LINK_ID } }),
    prisma.payout.findUnique({ where: { id: PAYOUT_ID } }),
    prisma.commission.findMany({
      where: { customerId: CUSTOMER_ID },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const pendingCommissions = commissions.filter((c) => c.status === "pending");
  const processedCommissions = commissions.filter(
    (c) => c.status === "processed",
  );
  const processedIds = processedCommissions.map((c) => c.id);
  const payoutIdsToRetally = Array.from(
    new Set(
      processedCommissions
        .map((c) => c.payoutId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (payoutIdsToRetally.length === 0 && payout) {
    payoutIdsToRetally.push(PAYOUT_ID);
  }

  console.log(`=== Mode: ${DRY_RUN ? "DRY RUN" : "EXECUTE"} ===`);
  console.log("=== Before ===");
  console.table({
    customerId: customer.id,
    email: customer.email,
    partnerId: customer.partnerId,
    linkId: customer.linkId,
    sales: customer.sales,
    saleAmount: Number(customer.saleAmount),
  });
  console.table(
    commissions.map((c) => ({
      id: c.id,
      status: c.status,
      amount: c.amount,
      earnings: c.earnings,
      partnerId: c.partnerId,
      linkId: c.linkId,
      payoutId: c.payoutId,
      invoiceId: c.invoiceId,
    })),
  );
  console.table({
    oldLink: oldLink.shortLink,
    oldPartnerId: oldLink.partnerId,
    newLink: newLink.shortLink,
    newPartnerId: newLink.partnerId,
    payoutStatus: payout?.status ?? "(missing)",
    payoutAmount: payout?.amount ?? null,
  });

  // --- Guards ---
  if (
    customer.partnerId !== OLD_PARTNER_ID ||
    customer.linkId !== OLD_LINK_ID
  ) {
    throw new Error(
      `Customer is not on expected old attribution (partnerId=${customer.partnerId}, linkId=${customer.linkId}). Aborting.`,
    );
  }

  if (newLink.partnerId !== NEW_PARTNER_ID) {
    throw new Error(
      `Target link ${NEW_LINK_ID} is not owned by expected partner (${NEW_PARTNER_ID}). Got ${newLink.partnerId}.`,
    );
  }

  const paidCommissions = commissions.filter((c) => c.status === "paid");
  if (paidCommissions.length > 0) {
    throw new Error(
      `Found ${paidCommissions.length} paid commission(s). Aborting — clawback path not implemented for this script.`,
    );
  }

  if (payout && !MUTABLE_PAYOUT_STATUSES.includes(payout.status)) {
    throw new Error(
      `Payout ${PAYOUT_ID} status is "${payout.status}" (not mutable). Aborting.`,
    );
  }

  const [{ data: leadEvents }, { data: saleEvents }] = await Promise.all([
    getLeadEvents({ customerId: CUSTOMER_ID }),
    getSaleEvents({ customerId: CUSTOMER_ID }),
  ]);

  console.log("=== Planned changes ===");
  console.table([
    {
      action: "customer attribution",
      detail: `${customer.partnerId} / ${customer.linkId} → ${newLink.partnerId} / ${newLink.id}`,
    },
    {
      action: "pending commissions → new partner/link",
      detail: pendingCommissions.length,
    },
    {
      action: "processed → pending, detach payout",
      detail: processedCommissions.length,
    },
    {
      action: "retally payouts",
      detail: payoutIdsToRetally.join(", ") || "(none)",
    },
    {
      action: "link delta (old -/new +)",
      detail: `clicks/leads/conversions=1, sales=${customer.sales}, saleAmount=${Number(customer.saleAmount)}`,
    },
    {
      action: "tinybird lead rewrite",
      detail: leadEvents.length,
    },
    {
      action: "tinybird sale rewrite",
      detail: saleEvents.length,
    },
  ]);

  if (DRY_RUN) {
    console.log(
      "Dry run complete — no writes. Set DRY_RUN = false to execute.",
    );
    return;
  }

  // --- Customer ---
  const updatedCustomer = await prisma.customer.update({
    where: { id: CUSTOMER_ID },
    data: {
      linkId: newLink.id,
      programId: PROGRAM_ID,
      partnerId: newLink.partnerId!,
    },
  });
  console.log(
    `Updated customer ${CUSTOMER_ID} → link ${newLink.shortLink} / partner ${newLink.partnerId}`,
  );

  // --- Pending commissions ---
  const pendingUpdated = await prisma.commission.updateMany({
    where: {
      customerId: CUSTOMER_ID,
      status: "pending",
    },
    data: {
      linkId: newLink.id,
      partnerId: newLink.partnerId!,
    },
  });
  console.log(
    `Updated ${pendingUpdated.count} pending commission(s) to new partner`,
  );

  // --- Processed commissions (on payout) ---
  if (processedIds.length > 0) {
    const processedUpdated = await prisma.commission.updateMany({
      where: { id: { in: processedIds } },
      data: {
        linkId: newLink.id,
        partnerId: newLink.partnerId!,
        payoutId: null,
        status: "pending",
      },
    });
    console.log(
      `Moved ${processedUpdated.count} processed commission(s) to new partner (detached from payout, status → pending)`,
    );

    const deletedActivityLogs = await prisma.activityLog.deleteMany({
      where: {
        resourceType: "commission",
        resourceId: { in: processedIds },
      },
    });
    console.log(
      `Deleted ${deletedActivityLogs.count} activity log(s) for processed commissions`,
    );
  }

  // --- Retally old partner payout ---
  await retallyPayoutsAmount(payoutIdsToRetally);

  // --- Link counters (delta by this customer's contribution) ---
  const updatedOldLink = await prisma.link.update({
    where: { id: oldLink.id },
    data: {
      clicks: { decrement: 1 },
      leads: { decrement: 1 },
      conversions: { decrement: 1 },
      sales: { decrement: updatedCustomer.sales },
      saleAmount: { decrement: updatedCustomer.saleAmount },
    },
  });
  console.log(
    `Decremented old link ${oldLink.id}: leads=${updatedOldLink.leads} sales=${updatedOldLink.sales} saleAmount=${updatedOldLink.saleAmount}`,
  );

  const updatedNewLink = await prisma.link.update({
    where: { id: newLink.id },
    data: {
      clicks: { increment: 1 },
      leads: { increment: 1 },
      conversions: { increment: 1 },
      sales: { increment: updatedCustomer.sales },
      saleAmount: { increment: updatedCustomer.saleAmount },
    },
  });
  console.log(
    `Incremented new link ${newLink.id}: leads=${updatedNewLink.leads} sales=${updatedNewLink.sales} saleAmount=${updatedNewLink.saleAmount}`,
  );

  // --- Partner commission totals ---
  await syncTotalCommissions({
    partnerId: OLD_PARTNER_ID,
    programId: PROGRAM_ID,
  });
  await syncTotalCommissions({
    partnerId: NEW_PARTNER_ID,
    programId: PROGRAM_ID,
  });

  // --- Tinybird: lead ---
  const oldLead = leadEvents[0];
  if (oldLead) {
    const updatedLead = {
      ...oldLead,
      link_id: newLink.id,
      key: newLink.key,
    };
    console.log("Rewriting Tinybird lead event:", updatedLead);
    console.log(await recordLeadWithTimestamp(updatedLead));

    const leadDeleteRes = await Promise.allSettled([
      deleteTinybirdRows({
        dataSource: "dub_lead_events",
        customerId: CUSTOMER_ID,
        oldLinkId: OLD_LINK_ID,
      }),
      deleteTinybirdRows({
        dataSource: "dub_lead_events_mv",
        customerId: CUSTOMER_ID,
        oldLinkId: OLD_LINK_ID,
      }),
    ]);
    console.log("Lead delete results:", leadDeleteRes);
  } else {
    console.log("No Tinybird lead event found — skipping lead rewrite");
  }

  // --- Tinybird: sales ---
  if (saleEvents.length > 0) {
    const updatedSales = saleEvents.map((item) => ({
      ...item,
      link_id: newLink.id,
      key: newLink.key,
    }));
    console.log(`Rewriting ${updatedSales.length} Tinybird sale event(s)`);
    console.log(await recordSaleWithTimestamp(updatedSales));

    const saleDeleteRes = await Promise.allSettled([
      deleteTinybirdRows({
        dataSource: "dub_sale_events",
        customerId: CUSTOMER_ID,
        oldLinkId: OLD_LINK_ID,
      }),
      deleteTinybirdRows({
        dataSource: "dub_sale_events_mv",
        customerId: CUSTOMER_ID,
        oldLinkId: OLD_LINK_ID,
      }),
    ]);
    console.log("Sale delete results:", saleDeleteRes);
  } else {
    console.log("No Tinybird sale events found — skipping sale rewrite");
  }

  // --- After summary ---
  const [finalCustomer, finalCommissions] = await Promise.all([
    prisma.customer.findUniqueOrThrow({ where: { id: CUSTOMER_ID } }),
    prisma.commission.findMany({
      where: { customerId: CUSTOMER_ID },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  console.log("=== After ===");
  console.table({
    customerId: finalCustomer.id,
    email: finalCustomer.email,
    partnerId: finalCustomer.partnerId,
    linkId: finalCustomer.linkId,
    sales: finalCustomer.sales,
    saleAmount: Number(finalCustomer.saleAmount),
  });
  console.table(
    finalCommissions.map((c) => ({
      id: c.id,
      status: c.status,
      amount: c.amount,
      earnings: c.earnings,
      partnerId: c.partnerId,
      linkId: c.linkId,
      payoutId: c.payoutId,
      invoiceId: c.invoiceId,
    })),
  );
}

main();
