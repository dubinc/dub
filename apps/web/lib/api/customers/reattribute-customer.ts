import { reconcilePayoutAmounts } from "@/lib/api/commissions/reconcile-payout-amounts";
import { updateLinkStatsForImporter } from "@/lib/api/links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { MUTABLE_PAYOUT_STATUSES } from "@/lib/constants/payouts";
import { queuePartnerCommissionCreation } from "@/lib/partners/queue-partner-commission-creation";
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
import { CommissionType, Customer, EventType, Link } from "@prisma/client";
import * as z from "zod/v4";

export const CUSTOMER_REATTRIBUTION_EVENTS_LIMIT = 500;
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

function latestEventTimestamp(events: { timestamp: string }[]) {
  if (events.length === 0) {
    return null;
  }

  return events.reduce((latest, event) =>
    event.timestamp > latest.timestamp ? event : latest,
  ).timestamp;
}

function leadEventIdentity(event: CustomerTBEvent) {
  return `${event.event_name ?? ""}\0${event.timestamp}`;
}

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

export function isReattributedCustomerStub({
  externalId,
  partnerId,
  linkId,
  programId,
}: {
  externalId: string | null;
  partnerId: string | null;
  linkId: string | null;
  programId: string | null;
}) {
  return (
    (externalId?.startsWith("reattributed_") === true ||
      externalId?.startsWith("dummy_") === true ||
      externalId?.startsWith("retired_") === true) &&
    partnerId == null &&
    linkId == null &&
    programId == null
  );
}

export async function getCustomerReattributeEvents(customerId: string) {
  const { data } = await getCustomerEventsTB({
    customerId,
    limit: CUSTOMER_REATTRIBUTION_EVENTS_LIMIT,
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
        externalId: `reattributed_${nanoid(32)}`,
        stripeCustomerId: null,
        linkId: null,
        clickId: null,
        clickedAt: null,
        programId: null,
        partnerId: null,
        sales: 0,
        saleAmount: 0,
        firstSaleAt: null,
        subscriptionCanceledAt: null,
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

export async function rollbackCustomerRecreation({
  customer,
  newCustomerId,
}: {
  customer: Customer;
  newCustomerId: string;
}) {
  return await prisma.$transaction(async (tx) => {
    await tx.customer.delete({
      where: {
        id: newCustomerId,
      },
    });

    return await tx.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        name: customer.name,
        externalId: customer.externalId,
        stripeCustomerId: customer.stripeCustomerId,
        linkId: customer.linkId,
        programId: customer.programId,
        partnerId: customer.partnerId,
        clickId: customer.clickId,
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

  if (oldEvents.length >= CUSTOMER_REATTRIBUTION_EVENTS_LIMIT) {
    throw new Error(
      `Customer ${oldCustomerId} has too many events to reattribute (limit ${CUSTOMER_REATTRIBUTION_EVENTS_LIMIT}).`,
    );
  }

  const sourceEvents = oldEvents.length > 0 ? oldEvents : newEvents;
  const clickEvent = sourceEvents.find((event) => event.event === "click");
  const leadEvents = sourceEvents.filter((event) => event.event === "lead");
  const saleEvents = sourceEvents.filter((event) => event.event === "sale");

  return {
    hasClick: Boolean(clickEvent),
    hasLead: leadEvents.length > 0,
    leadCount: leadEvents.length,
    saleCount: saleEvents.length,
    saleAmount: saleEvents.reduce(
      (sum, event) => sum + (event.saleAmount ?? 0),
      0,
    ),
    leadTimestamp: latestEventTimestamp(leadEvents),
    saleTimestamp: latestEventTimestamp(saleEvents),
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

  if (oldEvents.length >= CUSTOMER_REATTRIBUTION_EVENTS_LIMIT) {
    throw new Error(
      `Customer ${oldCustomerId} has too many events to reattribute (limit ${CUSTOMER_REATTRIBUTION_EVENTS_LIMIT}).`,
    );
  }

  const newHasClick = newEvents.some((event) => event.event === "click");
  const remainingNewLeadCounts = new Map<string, number>();

  for (const event of newEvents) {
    if (event.event !== "lead") {
      continue;
    }

    const key = leadEventIdentity(event);
    remainingNewLeadCounts.set(key, (remainingNewLeadCounts.get(key) ?? 0) + 1);
  }

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
  const leadEvents = oldEvents.filter((event) => {
    if (event.event !== "lead") {
      return false;
    }

    const key = leadEventIdentity(event);
    const remaining = remainingNewLeadCounts.get(key) ?? 0;

    if (remaining > 0) {
      remainingNewLeadCounts.set(key, remaining - 1);
      return false;
    }

    return true;
  });
  const saleEvents = oldEvents.filter((event) => {
    if (event.event !== "sale") {
      return false;
    }

    if (event.invoice_id) {
      return !newSaleInvoiceIds.has(event.invoice_id);
    }

    return !newInvoicelessSaleTimestamps.has(event.timestamp);
  });

  if (!clickEvent && leadEvents.length === 0 && saleEvents.length === 0) {
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

  if (leadEvents.length > 0) {
    const leadEventsData = leadEvents.map((existingLeadEvent) =>
      leadEventSchemaTBWithTimestamp.parse({
        ...clickEventData,
        ...existingLeadEvent,
        ...newClickAttributes,
        event_id: nanoid(16),
        link_id: link.id,
        customer_id: newCustomerId,
      }),
    );

    eventsToRecord.push(recordLeadWithTimestamp(leadEventsData));
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
  let transferred = 0;

  const didUpdate = await runOnce({
    key: `reattribute-customer:${oldCustomerId}:transfer-unpaid`,
    fn: async () => {
      const unpaidCommissions = await prisma.commission.findMany({
        where: {
          customerId: oldCustomerId,
          status: { in: [...UNPAID_COMMISSION_STATUSES] },
        },
        select: {
          id: true,
          status: true,
          payoutId: true,
          payout: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      const transferablePendingOrHoldIds: string[] = [];
      const transferableProcessedIds: string[] = [];
      const mutablePayoutIds: string[] = [];

      for (const commission of unpaidCommissions) {
        const isLocked =
          Boolean(commission.payoutId) &&
          commission.payout != null &&
          !MUTABLE_PAYOUT_STATUSES.includes(commission.payout.status);

        if (isLocked) {
          continue;
        }

        if (
          commission.payoutId &&
          commission.payout &&
          MUTABLE_PAYOUT_STATUSES.includes(commission.payout.status)
        ) {
          mutablePayoutIds.push(commission.payoutId);
        }

        if (commission.status === "processed") {
          transferableProcessedIds.push(commission.id);
        } else {
          transferablePendingOrHoldIds.push(commission.id);
        }
      }

      const transferableIds = [
        ...transferablePendingOrHoldIds,
        ...transferableProcessedIds,
      ];

      if (transferableIds.length === 0) {
        return;
      }

      const stillTransferable = {
        OR: [
          { payoutId: null },
          {
            payout: {
              status: {
                in: MUTABLE_PAYOUT_STATUSES,
              },
            },
          },
        ],
      };

      if (transferablePendingOrHoldIds.length > 0) {
        await prisma.commission.updateMany({
          where: {
            id: { in: transferablePendingOrHoldIds },
            ...stillTransferable,
          },
          data: {
            customerId: newCustomerId,
            partnerId: newPartnerId,
            linkId: newLinkId,
            payoutId: null,
          },
        });
      }

      if (transferableProcessedIds.length > 0) {
        await prisma.commission.updateMany({
          where: {
            id: { in: transferableProcessedIds },
            ...stillTransferable,
          },
          data: {
            customerId: newCustomerId,
            partnerId: newPartnerId,
            linkId: newLinkId,
            payoutId: null,
            status: "pending",
          },
        });
      }

      await reconcilePayoutAmounts([...new Set(mutablePayoutIds)]);

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

      transferred = transferableIds.length;
    },
  });

  return { transferred: didUpdate ? transferred : 0 };
}

export type ClawbackPlan =
  | { skipped: true; reason: "no-old-partner" | "no-paid-earnings" }
  | {
      skipped: false;
      paidCommissionIds: string[];
      paidEarnings: number;
      hasPaidLead: boolean;
      paidInvoiceIds: string[];
      paidInvoicelessCount: number;
      shouldClearIdentifiers: boolean;
    };

export async function loadClawbackPlan({
  oldCustomerId,
  oldPartnerId,
}: {
  oldCustomerId: string;
  oldPartnerId: string | null;
}): Promise<ClawbackPlan> {
  if (!oldPartnerId) {
    return { skipped: true, reason: "no-old-partner" };
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
    return { skipped: true, reason: "no-paid-earnings" };
  }

  return {
    skipped: false,
    paidCommissionIds: paidCommissions.map((commission) => commission.id),
    paidEarnings,
    hasPaidLead: paidCommissions.some(
      (commission) => commission.type === "lead",
    ),
    paidInvoiceIds: paidCommissions
      .filter(
        (commission) => commission.type === "sale" && commission.invoiceId,
      )
      .map((commission) => commission.invoiceId!),
    paidInvoicelessCount: paidCommissions.filter(
      (commission) => commission.type === "sale" && !commission.invoiceId,
    ).length,
    shouldClearIdentifiers: paidCommissions.some(
      (commission) => commission.eventId || commission.invoiceId,
    ),
  };
}

export async function applyClawbackAndReplacementCommissions({
  oldCustomerId,
  newCustomerId,
  oldPartnerId,
  newPartnerId,
  newLinkId,
  programId,
  customerCountry,
  plan,
}: {
  oldCustomerId: string;
  newCustomerId: string;
  oldPartnerId: string;
  newPartnerId: string;
  newLinkId: string;
  programId: string;
  customerCountry: string | null;
  plan: Extract<ClawbackPlan, { skipped: false }>;
}) {
  if (plan.shouldClearIdentifiers && plan.paidCommissionIds.length > 0) {
    await prisma.commission.updateMany({
      where: {
        id: { in: plan.paidCommissionIds },
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
        amount: -plan.paidEarnings,
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
        eventId: true,
        invoiceId: true,
      },
    }),
  ]);

  const hasExistingLead = existingNewCommissions.some(
    (commission) => commission.type === "lead",
  );

  const leadEvent =
    plan.hasPaidLead && !hasExistingLead
      ? newEvents.find((event) => event.event === "lead") ?? null
      : null;

  const paidInvoiceIds = new Set(plan.paidInvoiceIds);
  const existingInvoiceIds = new Set(
    existingNewCommissions
      .map((commission) => commission.invoiceId)
      .filter((invoiceId): invoiceId is string => Boolean(invoiceId)),
  );
  const existingEventIds = new Set(
    existingNewCommissions
      .map((commission) => commission.eventId)
      .filter((eventId): eventId is string => Boolean(eventId)),
  );

  const saleEvents = [
    ...newEvents.filter(
      (event) =>
        event.event === "sale" &&
        event.invoice_id &&
        paidInvoiceIds.has(event.invoice_id) &&
        !existingInvoiceIds.has(event.invoice_id),
    ),
    ...sortEventsByTimestamp(
      newEvents.filter((event) => event.event === "sale" && !event.invoice_id),
    )
      .slice(0, plan.paidInvoicelessCount)
      .filter(
        (event) => !event.event_id || !existingEventIds.has(event.event_id),
      ),
  ];

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

export function sortEventsByTimestamp<
  T extends Pick<CustomerTBEvent, "timestamp">,
>(events: T[]) {
  return [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// Finds lead and sale events that don't have a commission yet.
// Existing commissions are matched by event ID, then invoice ID, then
// (for sales without an invoice) one per sale, oldest first.
export function selectUncommissionedEvents<
  T extends Pick<CustomerTBEvent, "timestamp" | "event_id" | "invoice_id"> & {
    event: string;
  },
>({
  newEvents,
  existingCommissions,
}: {
  newEvents: T[];
  existingCommissions: {
    type: CommissionType;
    eventId: string | null;
    invoiceId: string | null;
  }[];
}) {
  const currentEventIds = new Set(newEvents.map((event) => event.event_id));
  const commissionedEventIds = new Set<string>();
  const priorInvoiceIds = new Set<string>();

  let hasPriorLead = false;
  // Counts the sale commissions that already exist from earlier history but have no invoice ID.
  let priorInvoicelessCount = 0;

  for (const commission of existingCommissions) {
    if (commission.eventId) {
      commissionedEventIds.add(commission.eventId);

      if (currentEventIds.has(commission.eventId)) {
        continue;
      }
    }

    if (commission.type === CommissionType.lead) {
      hasPriorLead = true;
    } else if (commission.type === CommissionType.sale) {
      if (commission.invoiceId) {
        priorInvoiceIds.add(commission.invoiceId);
      } else {
        priorInvoicelessCount++;
      }
    }
  }

  let leadEvent: T | null = null;
  const saleEvents: T[] = [];

  for (const event of sortEventsByTimestamp(newEvents)) {
    const isInvoicelessSale =
      event.event === EventType.sale && !event.invoice_id;

    // Sales without an invoice can't be matched to a commission by ID: the copied
    // events have new event IDs and there is no invoice ID to compare. Instead,
    // each prior invoiceless commission covers one invoiceless sale, oldest first,
    // and only the sales left over get a new commission. Clawback recreates paid
    // ones from the oldest sales too, so the two steps never pick the same sale.
    if (isInvoicelessSale && priorInvoicelessCount > 0) {
      priorInvoicelessCount--;
      continue;
    }

    if (!event.event_id || commissionedEventIds.has(event.event_id)) {
      continue;
    }

    if (event.event === EventType.lead) {
      if (!hasPriorLead && !leadEvent) {
        leadEvent = event;
      }
    } else if (event.event === EventType.sale) {
      if (isInvoicelessSale || !priorInvoiceIds.has(event.invoice_id!)) {
        saleEvents.push(event);
      }
    }
  }

  return {
    leadEvent,
    saleEvents,
  };
}

export class ReattributeEventsNotReadyError extends Error {}

// Creates commissions for lead/sale events that have none, when this customer
// has never had a lead or sale commission:
// - the customer came from a regular short link (no partner, so no commissions)
// - the old partner never earned a lead or sale commission
// - events were tracked before the old link was added to a program
//
// Any existing lead or sale commission means the reward engine already ran.
// Paid rows stay on the old customer, so replaying later uncommissioned sales
// would treat them as a new first sale for the new partner.
export async function createMissingPartnerCommissions({
  oldCustomerId,
  newCustomerId,
  newPartnerId,
  newLinkId,
  programId,
  plan,
}: {
  oldCustomerId: string;
  newCustomerId: string;
  newPartnerId: string;
  newLinkId: string;
  programId: string;
  plan: ReattributeEventPlan;
}) {
  const existingCommission = await prisma.commission.findFirst({
    where: {
      customerId: {
        in: [oldCustomerId, newCustomerId],
      },
      type: {
        in: [CommissionType.lead, CommissionType.sale],
      },
    },
    select: {
      id: true,
    },
  });

  if (existingCommission) {
    return {
      skipped: true,
      reason: "existing-commissions",
      created: 0,
    };
  }

  const [newEvents, existingCommissions, newCustomer] = await Promise.all([
    getCustomerReattributeEvents(newCustomerId),

    prisma.commission.findMany({
      where: {
        customerId: {
          in: [oldCustomerId, newCustomerId],
        },
        type: {
          in: [CommissionType.lead, CommissionType.sale],
        },
      },
      select: {
        type: true,
        eventId: true,
        invoiceId: true,
      },
    }),

    prisma.customer.findUnique({
      where: {
        id: newCustomerId,
      },
      select: {
        country: true,
      },
    }),
  ]);

  const newLeadCount = newEvents.filter(
    (e) => e.event === EventType.lead,
  ).length;

  const newSaleCount = newEvents.filter(
    (e) => e.event === EventType.sale,
  ).length;

  if (newLeadCount < plan.leadCount || newSaleCount < plan.saleCount) {
    throw new ReattributeEventsNotReadyError(
      `Re-ingested events for customer ${newCustomerId} are not queryable yet.`,
    );
  }

  const { leadEvent, saleEvents } = selectUncommissionedEvents({
    newEvents,
    existingCommissions,
  });

  if (!leadEvent && saleEvents.length === 0) {
    return {
      skipped: true,
      created: 0,
    };
  }

  let created = 0;

  await runOnce({
    key: `reattribute-customer:${oldCustomerId}:missing-commissions`,
    fn: async () => {
      const context = {
        customer: {
          country: newCustomer?.country ?? null,
        },
      };

      if (leadEvent?.event_id) {
        await queuePartnerCommissionCreation({
          event: CommissionType.lead,
          programId,
          partnerId: newPartnerId,
          linkId: newLinkId,
          customerId: newCustomerId,
          eventId: leadEvent.event_id,
          quantity: 1,
          createdAt: new Date(`${leadEvent.timestamp}Z`),
          context,
          skipWorkflow: true,
        });

        created++;
      }

      for (const saleEvent of saleEvents) {
        await queuePartnerCommissionCreation({
          event: CommissionType.sale,
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
          context,
          skipWorkflow: true,
        });

        created++;
      }
    },
  });

  return {
    skipped: false,
    created,
  };
}
