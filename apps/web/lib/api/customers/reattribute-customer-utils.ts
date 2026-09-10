export const CUSTOMER_EVENTS_LIMIT = 1000;

export type CustomerTBEvent = {
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

export type ReattributeEventPlan = {
  hasClick: boolean;
  hasLead: boolean;
  leadCount: number;
  saleCount: number;
  saleAmount: number;
  leadTimestamp: string | null;
  saleTimestamp: string | null;
  oldEventIds: string[];
  alreadyReingested: boolean;
};

export function isRetiredReattributeStub(customer: {
  externalId?: string | null;
  partnerId?: string | null;
  linkId?: string | null;
  programId?: string | null;
}) {
  return (
    Boolean(customer.externalId?.startsWith("dummy_")) &&
    customer.partnerId == null &&
    customer.linkId == null &&
    customer.programId == null
  );
}

export function customerEventsExceedLimit(eventCount: number) {
  return eventCount >= CUSTOMER_EVENTS_LIMIT;
}

export function shouldRecreateCustomer({
  eventCount,
  commissionCount,
  clickId,
  sales,
}: {
  eventCount: number;
  commissionCount: number;
  clickId?: string | null;
  sales?: number;
}) {
  return (
    eventCount > 0 ||
    commissionCount > 0 ||
    Boolean(clickId) ||
    (sales ?? 0) > 0
  );
}

export function selectEventsToReingest({
  oldEvents,
  newEvents,
}: {
  oldEvents: CustomerTBEvent[];
  newEvents: CustomerTBEvent[];
}) {
  const newHasClick = newEvents.some((event) => event.event === "click");
  const newHasLead = newEvents.some((event) => event.event === "lead");
  const newSaleInvoiceIds = new Set(
    newEvents
      .filter((event) => event.event === "sale" && event.invoice_id)
      .map((event) => event.invoice_id)
      .filter((invoiceId): invoiceId is string => Boolean(invoiceId)),
  );
  const newInvoicelessSaleTimestamps = new Set(
    newEvents
      .filter((event) => event.event === "sale" && !event.invoice_id)
      .map((event) => event.timestamp),
  );

  return {
    clickEvent: !newHasClick
      ? oldEvents.find((event) => event.event === "click") ?? null
      : null,
    leadEvent: !newHasLead
      ? oldEvents.find((event) => event.event === "lead") ?? null
      : null,
    saleEvents: oldEvents.filter((event) => {
      if (event.event !== "sale") {
        return false;
      }

      if (event.invoice_id) {
        return !newSaleInvoiceIds.has(event.invoice_id);
      }

      return !newInvoicelessSaleTimestamps.has(event.timestamp);
    }),
  };
}

export function selectPaidReplacementEvents({
  paidInvoiceIds,
  hasPaidLead,
  newEvents,
  existingNewCommissions,
}: {
  paidInvoiceIds: string[];
  hasPaidLead: boolean;
  newEvents: CustomerTBEvent[];
  existingNewCommissions: Array<{
    type: string;
    invoiceId: string | null;
  }>;
}) {
  const hasExistingLead = existingNewCommissions.some(
    (commission) => commission.type === "lead",
  );
  const existingInvoiceIds = new Set(
    existingNewCommissions
      .map((commission) => commission.invoiceId)
      .filter((invoiceId): invoiceId is string => Boolean(invoiceId)),
  );
  const paidInvoiceIdSet = new Set(paidInvoiceIds);

  return {
    leadEvent:
      hasPaidLead && !hasExistingLead
        ? newEvents.find((event) => event.event === "lead") ?? null
        : null,
    saleEvents: newEvents.filter(
      (event) =>
        event.event === "sale" &&
        Boolean(event.invoice_id) &&
        paidInvoiceIdSet.has(event.invoice_id!) &&
        !existingInvoiceIds.has(event.invoice_id!),
    ),
  };
}

export function summarizeCustomerEvents(
  events: CustomerTBEvent[],
): Omit<ReattributeEventPlan, "alreadyReingested"> {
  const clickEvent = events.find((event) => event.event === "click");
  const leadEvent = events.find((event) => event.event === "lead");
  const saleEvents = events.filter((event) => event.event === "sale");

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
    oldEventIds: [
      leadEvent?.event_id,
      ...saleEvents.map((event) => event.event_id),
    ].filter((eventId): eventId is string => typeof eventId === "string"),
  };
}
