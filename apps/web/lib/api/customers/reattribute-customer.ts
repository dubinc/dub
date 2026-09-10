import { reconcilePayoutAmounts } from "@/lib/api/commissions/reconcile-payout-amounts";
import { updateLinkStatsForImporter } from "@/lib/api/links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { MUTABLE_PAYOUT_STATUSES } from "@/lib/constants/payouts";
import { queuePartnerCommissionCreation } from "@/lib/partners/queue-partner-commission-creation";
import { retallyPayoutsAmount } from "@/lib/payouts/retally-payouts-amount";
import { prisma } from "@/lib/prisma";
import { getCustomerEventsTB } from "@/lib/tinybird/get-customer-events-tb";
import {
  recordClickZod,
  recordClickZodSchema,
} from "@/lib/tinybird/record-click-zod";
import { recordLeadWithTimestamp } from "@/lib/tinybird/record-lead";
import { recordSaleWithTimestamp } from "@/lib/tinybird/record-sale";
import { redis } from "@/lib/upstash";
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import { saleEventSchemaTB } from "@/lib/zod/schemas/sales";
import { nanoid } from "@dub/utils";
import { Customer, Link } from "@prisma/client";
import * as z from "zod/v4";

export const CUSTOMER_EVENTS_LIMIT = 1000;
const UNPAID_COMMISSION_STATUSES = ["pending", "hold", "processed"] as const;
const STATS_LOCK_TTL_SECONDS = 60 * 60 * 24;

const leadEventSchemaTBWithTimestamp = leadEventSchemaTB.extend({
  timestamp: z.string(),
});

const saleEventSchemaTBWithTimestamp = saleEventSchemaTB.extend({
  timestamp: z.string(),
});

type CustomerTBEvent = {
  event: "click" | "lead" | "sale";
  timestamp: string;
  click_id?: string;
  link_id?: string;
  event_id?: string;
  event_name?: string;
  saleAmount?: number;
  invoice_id?: string;
  payment_processor?: string;
  currency?: string;
  [key: string]: unknown;
};

type ReattributeEventPlan = {
  hasClick: boolean;
  hasLead: boolean;
  leadCount: number;
  saleCount: number;
  saleAmount: number;
  leadTimestamp: string | null;
  saleTimestamp: string | null;
};

async function runOnce({ key, fn }: { key: string; fn: () => Promise<void> }) {
  const acquired = await redis.set(key, "1", {
    nx: true,
    ex: STATS_LOCK_TTL_SECONDS,
  });

  if (acquired !== "OK") {
    return false;
  }

  try {
    await fn();
    return true;
  } catch (error) {
    await redis.del(key);
    throw error;
  }
}

export async function getCustomerReattributeEvents(customerId: string) {
  const { data } = await getCustomerEventsTB({
    customerId,
    limit: CUSTOMER_EVENTS_LIMIT,
  });

  return (data ?? []).filter(
    (event): event is CustomerTBEvent =>
      typeof event === "object" &&
      event !== null &&
      "event" in event &&
      (event.event === "click" ||
        event.event === "lead" ||
        event.event === "sale"),
  );
}

export async function recreateCustomerForReattribution({
  customer,
  link,
  newCustomerId,
  newClickId,
}: {
  customer: Customer;
  link: Pick<Link, "id" | "programId" | "partnerId">;
  newCustomerId: string;
  newClickId: string;
}) {
  return await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        name: customer.name ? `${customer.name} (old)` : undefined,
        externalId: `dummy_${nanoid(32)}`,
        stripeCustomerId: null,
        linkId: null,
        programId: null,
        partnerId: null,
        clickId: null,
      },
    });

    return await tx.customer.create({
      data: {
        id: newCustomerId,
        name: customer.name,
        email: customer.email,
        avatar: customer.avatar,
        externalId: customer.externalId,
        stripeCustomerId: customer.stripeCustomerId,
        clickedAt: customer.clickedAt,
        country: customer.country,
        sales: customer.sales,
        saleAmount: customer.saleAmount,
        firstSaleAt: customer.firstSaleAt,
        subscriptionCanceledAt: customer.subscriptionCanceledAt,
        projectId: customer.projectId,
        projectConnectId: customer.projectConnectId,
        createdAt: customer.createdAt,
        linkId: link.id,
        programId: link.programId,
        partnerId: link.partnerId,
        clickId: newClickId,
      },
    });
  });
}

export async function loadReattributeEventPlan({
  oldCustomerId,
  newCustomerId,
}: {
  oldCustomerId: string;
  newCustomerId: string;
}): Promise<ReattributeEventPlan> {
  const [oldEvents, newEvents] = await Promise.all([
    getCustomerReattributeEvents(oldCustomerId),
    getCustomerReattributeEvents(newCustomerId),
  ]);

  if (oldEvents.length >= CUSTOMER_EVENTS_LIMIT) {
    throw new Error(
      `Customer ${oldCustomerId} has too many events to reattribute (limit ${CUSTOMER_EVENTS_LIMIT}).`,
    );
  }

  const sourceEvents = oldEvents.length > 0 ? oldEvents : newEvents;
  const clickEvent = sourceEvents.find((event) => event.event === "click");
  const leadEvent = sourceEvents.find((event) => event.event === "lead");
  const saleEvents = sourceEvents.filter((event) => event.event === "sale");

  return {
    hasClick: Boolean(clickEvent),
    hasLead: Boolean(leadEvent),
    leadCount: leadEvent ? 1 : 0,
    saleCount: saleEvents.length,
    saleAmount: saleEvents.reduce(
      (sum, event) => sum + (event.saleAmount ?? 0),
      0,
    ),
    leadTimestamp: leadEvent?.timestamp ?? null,
    saleTimestamp:
      saleEvents.length > 0
        ? saleEvents.reduce((latest, event) =>
            event.timestamp > latest.timestamp ? event : latest,
          ).timestamp
        : null,
  };
}

export async function reingestCustomerEvents({
  oldCustomerId,
  newCustomerId,
  newClickId,
  link,
  workspaceId,
}: {
  oldCustomerId: string;
  newCustomerId: string;
  newClickId: string;
  link: Pick<Link, "id" | "domain" | "key" | "url">;
  workspaceId: string;
}) {
  const [oldEvents, newEvents] = await Promise.all([
    getCustomerReattributeEvents(oldCustomerId),
    getCustomerReattributeEvents(newCustomerId),
  ]);

  if (oldEvents.length >= CUSTOMER_EVENTS_LIMIT) {
    throw new Error(
      `Customer ${oldCustomerId} has too many events to reattribute (limit ${CUSTOMER_EVENTS_LIMIT}).`,
    );
  }

  const newHasClick = newEvents.some((event) => event.event === "click");
  const newHasLead = newEvents.some((event) => event.event === "lead");
  const newSaleInvoiceIds = new Set(
    newEvents
      .filter((event) => event.event === "sale" && event.invoice_id)
      .map((event) => event.invoice_id),
  );
  const newInvoicelessSaleTimestamps = new Set(
    newEvents
      .filter((event) => event.event === "sale" && !event.invoice_id)
      .map((event) => event.timestamp),
  );

  const clickEvent = !newHasClick
    ? oldEvents.find((event) => event.event === "click") ?? null
    : null;
  const leadEvent = !newHasLead
    ? oldEvents.find((event) => event.event === "lead") ?? null
    : null;
  const saleEvents = oldEvents.filter((event) => {
    if (event.event !== "sale") {
      return false;
    }

    if (event.invoice_id) {
      return !newSaleInvoiceIds.has(event.invoice_id);
    }

    return !newInvoicelessSaleTimestamps.has(event.timestamp);
  });

  if (!clickEvent && !leadEvent && saleEvents.length === 0) {
    return {
      skipped: true,
      reason:
        oldEvents.length > 0
          ? ("already-reingested" as const)
          : ("no-events" as const),
    };
  }

  const sourceClickEvent =
    oldEvents.find((event) => event.event === "click") ??
    newEvents.find((event) => event.event === "click");

  const newClickAttributes = {
    click_id: newClickId,
    link_id: link.id,
  };

  const clickEventData = recordClickZodSchema.parse({
    ...sourceClickEvent,
    ...newClickAttributes,
    workspace_id: workspaceId,
    domain: link.domain,
    key: link.key,
    url: link.url,
  });

  const eventsToRecord: Promise<unknown>[] = [];

  if (clickEvent) {
    eventsToRecord.push(recordClickZod(clickEventData));
  }

  if (leadEvent) {
    const leadEventData = leadEventSchemaTBWithTimestamp.parse({
      ...clickEventData,
      ...leadEvent,
      ...newClickAttributes,
      event_id: nanoid(16),
      link_id: link.id,
      customer_id: newCustomerId,
    });

    eventsToRecord.push(recordLeadWithTimestamp(leadEventData));
  }

  if (saleEvents.length > 0) {
    const saleEventsData = saleEvents.map((existingSaleEvent) =>
      saleEventSchemaTBWithTimestamp.parse({
        ...clickEventData,
        ...existingSaleEvent,
        ...newClickAttributes,
        event_id: nanoid(16),
        link_id: link.id,
        customer_id: newCustomerId,
        amount: existingSaleEvent.saleAmount,
      }),
    );

    eventsToRecord.push(recordSaleWithTimestamp(saleEventsData));
  }

  const results = await Promise.allSettled(eventsToRecord);
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length > 0) {
    throw new Error(
      `Failed to re-ingest ${failed.length} Tinybird event batch(es) for customer ${newCustomerId}.`,
    );
  }

  return { skipped: false, recorded: eventsToRecord.length };
}

export async function incrementNewLinkStats({
  oldCustomerId,
  newLinkId,
  programId,
  partnerId,
  plan,
  incrementConversions,
}: {
  oldCustomerId: string;
  newLinkId: string;
  programId: string;
  partnerId: string;
  plan: ReattributeEventPlan;
  incrementConversions: boolean;
}) {
  const didUpdate = await runOnce({
    key: `reattribute-customer:${oldCustomerId}:new-link-stats`,
    fn: async () => {
      const link = await prisma.link.findUniqueOrThrow({
        where: { id: newLinkId },
        select: {
          id: true,
          lastLeadAt: true,
          lastConversionAt: true,
        },
      });

      const leadEventTimestamp = plan.leadTimestamp
        ? new Date(`${plan.leadTimestamp}Z`)
        : new Date();
      const saleEventTimestamp = plan.saleTimestamp
        ? new Date(`${plan.saleTimestamp}Z`)
        : new Date();

      await prisma.link.update({
        where: { id: newLinkId },
        data: {
          ...(plan.hasClick && {
            clicks: { increment: 1 },
          }),
          ...(plan.hasLead && {
            leads: { increment: plan.leadCount },
            lastLeadAt: updateLinkStatsForImporter({
              currentTimestamp: link.lastLeadAt,
              newTimestamp: leadEventTimestamp,
            }),
          }),
          ...(incrementConversions && {
            conversions: { increment: 1 },
            lastConversionAt: updateLinkStatsForImporter({
              currentTimestamp: link.lastConversionAt,
              newTimestamp: saleEventTimestamp,
            }),
          }),
          ...(plan.saleCount > 0 && {
            sales: { increment: plan.saleCount },
            saleAmount: { increment: plan.saleAmount },
          }),
        },
      });
    },
  });

  if (didUpdate && (plan.hasLead || plan.saleCount > 0)) {
    await syncPartnerLinksStats({
      partnerId,
      programId,
      eventType: plan.saleCount > 0 ? "sale" : "lead",
    });
  }
}

export async function decrementOldLinkStats({
  oldCustomerId,
  oldLinkId,
  oldPartnerId,
  programId,
  plan,
  decrementConversions,
}: {
  oldCustomerId: string;
  oldLinkId: string | null;
  oldPartnerId: string | null;
  programId: string;
  plan: ReattributeEventPlan;
  decrementConversions: boolean;
}) {
  if (!oldLinkId || !oldPartnerId) {
    return;
  }

  const didUpdate = await runOnce({
    key: `reattribute-customer:${oldCustomerId}:old-link-stats`,
    fn: async () => {
      await prisma.link.update({
        where: { id: oldLinkId },
        data: {
          ...(plan.hasClick && {
            clicks: { decrement: 1 },
          }),
          ...(plan.hasLead && {
            leads: { decrement: plan.leadCount },
          }),
          ...(decrementConversions && {
            conversions: { decrement: 1 },
          }),
          ...(plan.saleCount > 0 && {
            sales: { decrement: plan.saleCount },
            saleAmount: { decrement: plan.saleAmount },
          }),
        },
      });
    },
  });

  if (didUpdate && (plan.hasLead || plan.saleCount > 0)) {
    await syncPartnerLinksStats({
      partnerId: oldPartnerId,
      programId,
      eventType: plan.saleCount > 0 ? "sale" : "lead",
    });
  }
}

export async function transferUnpaidCommissions({
  oldCustomerId,
  newCustomerId,
  newPartnerId,
  newLinkId,
  programId,
  oldPartnerId,
}: {
  oldCustomerId: string;
  newCustomerId: string;
  newPartnerId: string;
  newLinkId: string;
  programId: string;
  oldPartnerId: string | null;
}) {
  const unpaidCommissions = await prisma.commission.findMany({
    where: {
      customerId: oldCustomerId,
      status: { in: [...UNPAID_COMMISSION_STATUSES] },
    },
    select: {
      id: true,
      payoutId: true,
      payout: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (unpaidCommissions.length === 0) {
    return { transferred: 0 };
  }

  const payoutIds = unpaidCommissions
    .map((commission) => commission.payoutId)
    .filter((payoutId): payoutId is string => Boolean(payoutId));

  const mutablePayoutIds = unpaidCommissions
    .filter(
      (commission) =>
        commission.payoutId &&
        commission.payout &&
        MUTABLE_PAYOUT_STATUSES.includes(commission.payout.status),
    )
    .map((commission) => commission.payoutId)
    .filter((payoutId): payoutId is string => Boolean(payoutId));

  const processedPayoutIds = payoutIds.filter(
    (payoutId) => !mutablePayoutIds.includes(payoutId),
  );

  await prisma.commission.updateMany({
    where: {
      id: { in: unpaidCommissions.map((commission) => commission.id) },
    },
    data: {
      customerId: newCustomerId,
      partnerId: newPartnerId,
      linkId: newLinkId,
      payoutId: null,
    },
  });

  await reconcilePayoutAmounts(mutablePayoutIds);
  await retallyPayoutsAmount(processedPayoutIds);

  await Promise.all([
    syncTotalCommissions({
      partnerId: newPartnerId,
      programId,
    }),
    oldPartnerId
      ? syncTotalCommissions({
          partnerId: oldPartnerId,
          programId,
        })
      : Promise.resolve(),
  ]);

  return { transferred: unpaidCommissions.length };
}

export async function createClawbackAndReplacementCommissions({
  oldCustomerId,
  newCustomerId,
  oldPartnerId,
  newPartnerId,
  newLinkId,
  programId,
  customerCountry,
}: {
  oldCustomerId: string;
  newCustomerId: string;
  oldPartnerId: string | null;
  newPartnerId: string;
  newLinkId: string;
  programId: string;
  customerCountry: string | null;
}) {
  if (!oldPartnerId) {
    return { skipped: true, reason: "no-old-partner" as const };
  }

  const paidCommissions = await prisma.commission.findMany({
    where: {
      customerId: oldCustomerId,
      partnerId: oldPartnerId,
      status: "paid",
    },
    select: {
      id: true,
      eventId: true,
      invoiceId: true,
      earnings: true,
      type: true,
    },
  });

  const paidEarnings = paidCommissions.reduce(
    (sum, commission) => sum + commission.earnings,
    0,
  );

  if (paidEarnings <= 0) {
    return { skipped: true, reason: "no-paid-earnings" as const };
  }

  const paidInvoiceIds = new Set(
    paidCommissions
      .map((commission) => commission.invoiceId)
      .filter((invoiceId): invoiceId is string => Boolean(invoiceId)),
  );
  const hasPaidLead = paidCommissions.some(
    (commission) => commission.type === "lead",
  );

  if (
    paidCommissions.some(
      (commission) => commission.eventId || commission.invoiceId,
    )
  ) {
    await prisma.commission.updateMany({
      where: {
        id: { in: paidCommissions.map((commission) => commission.id) },
      },
      data: {
        eventId: null,
        invoiceId: null,
      },
    });
  }

  await runOnce({
    key: `reattribute-customer:${oldCustomerId}:clawback`,
    fn: async () => {
      const existingClawback = await prisma.commission.findFirst({
        where: {
          customerId: oldCustomerId,
          partnerId: oldPartnerId,
          programId,
          type: "custom",
          description: "tracking_error",
          earnings: { lt: 0 },
        },
        select: { id: true },
      });

      if (existingClawback) {
        return;
      }

      await queuePartnerCommissionCreation({
        event: "custom",
        partnerId: oldPartnerId,
        programId,
        customerId: oldCustomerId,
        amount: -paidEarnings,
        quantity: 1,
        description: "tracking_error",
        skipWorkflow: true,
      });
    },
  });

  const [newEvents, existingNewCommissions] = await Promise.all([
    getCustomerReattributeEvents(newCustomerId),
    prisma.commission.findMany({
      where: {
        customerId: newCustomerId,
        partnerId: newPartnerId,
        type: { in: ["lead", "sale"] },
      },
      select: {
        type: true,
        invoiceId: true,
      },
    }),
  ]);

  const hasExistingLead = existingNewCommissions.some(
    (commission) => commission.type === "lead",
  );
  const existingInvoiceIds = new Set(
    existingNewCommissions
      .map((commission) => commission.invoiceId)
      .filter((invoiceId): invoiceId is string => Boolean(invoiceId)),
  );

  const leadEvent =
    hasPaidLead && !hasExistingLead
      ? newEvents.find((event) => event.event === "lead") ?? null
      : null;
  const saleEvents = newEvents.filter(
    (event) =>
      event.event === "sale" &&
      event.invoice_id &&
      paidInvoiceIds.has(event.invoice_id) &&
      !existingInvoiceIds.has(event.invoice_id),
  );

  if (leadEvent?.event_id) {
    await queuePartnerCommissionCreation({
      event: "lead",
      programId,
      partnerId: newPartnerId,
      linkId: newLinkId,
      customerId: newCustomerId,
      eventId: leadEvent.event_id,
      quantity: 1,
      createdAt: new Date(`${leadEvent.timestamp}Z`),
      context: {
        customer: { country: customerCountry },
      },
      skipWorkflow: true,
    });
  }

  for (const saleEvent of saleEvents) {
    if (!saleEvent.event_id) {
      continue;
    }

    await queuePartnerCommissionCreation({
      event: "sale",
      programId,
      partnerId: newPartnerId,
      linkId: newLinkId,
      customerId: newCustomerId,
      eventId: saleEvent.event_id,
      quantity: 1,
      amount: saleEvent.saleAmount,
      currency: saleEvent.currency,
      invoiceId: saleEvent.invoice_id,
      createdAt: new Date(`${saleEvent.timestamp}Z`),
      context: {
        customer: { country: customerCountry },
      },
      skipWorkflow: true,
    });
  }

  await Promise.all([
    syncTotalCommissions({
      partnerId: oldPartnerId,
      programId,
    }),
    syncTotalCommissions({
      partnerId: newPartnerId,
      programId,
    }),
  ]);

  return {
    skipped: false,
    clawback: true,
    recreated: (leadEvent ? 1 : 0) + saleEvents.length,
  };
}
