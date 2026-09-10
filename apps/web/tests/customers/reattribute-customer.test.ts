import {
  CUSTOMER_EVENTS_LIMIT,
  customerEventsExceedLimit,
  isRetiredReattributeStub,
  selectEventsToReingest,
  selectPaidReplacementEvents,
  shouldRecreateCustomer,
  type CustomerTBEvent,
} from "@/lib/api/customers/reattribute-customer-utils";
import { describe, expect, it } from "vitest";

function event(
  overrides: Partial<CustomerTBEvent> & Pick<CustomerTBEvent, "event">,
): CustomerTBEvent {
  return {
    timestamp: "2026-01-01 00:00:00",
    ...overrides,
  };
}

describe("shouldRecreateCustomer", () => {
  it("keeps the fast path for a manual customer", () => {
    expect(
      shouldRecreateCustomer({
        eventCount: 0,
        commissionCount: 0,
      }),
    ).toBe(false);
  });

  it("recreates when Tinybird events or commissions exist", () => {
    expect(shouldRecreateCustomer({ eventCount: 1, commissionCount: 0 })).toBe(
      true,
    );
    expect(shouldRecreateCustomer({ eventCount: 0, commissionCount: 2 })).toBe(
      true,
    );
  });

  it("recreates when clickId or sales are present even if Tinybird is empty", () => {
    expect(
      shouldRecreateCustomer({
        eventCount: 0,
        commissionCount: 0,
        clickId: "clk_abc",
      }),
    ).toBe(true);
    expect(
      shouldRecreateCustomer({
        eventCount: 0,
        commissionCount: 0,
        sales: 3,
      }),
    ).toBe(true);
  });
});

describe("isRetiredReattributeStub", () => {
  it("detects a retired stub", () => {
    expect(
      isRetiredReattributeStub({
        externalId: "dummy_abcdefghijklmnopqrstuvwxyz012345",
        partnerId: null,
        linkId: null,
        programId: null,
      }),
    ).toBe(true);
  });

  it("does not treat a live customer as retired", () => {
    expect(
      isRetiredReattributeStub({
        externalId: "user_123",
        partnerId: "pn_1",
        linkId: "link_1",
        programId: "prog_1",
      }),
    ).toBe(false);
  });

  it("requires dummy_ plus cleared attribution fields", () => {
    expect(
      isRetiredReattributeStub({
        externalId: "dummy_abc",
        partnerId: "pn_1",
        linkId: null,
        programId: null,
      }),
    ).toBe(false);
  });
});

describe("customerEventsExceedLimit", () => {
  it("refuses a truncated event page", () => {
    expect(customerEventsExceedLimit(CUSTOMER_EVENTS_LIMIT)).toBe(true);
    expect(customerEventsExceedLimit(CUSTOMER_EVENTS_LIMIT - 1)).toBe(false);
  });
});

describe("selectEventsToReingest", () => {
  const oldEvents: CustomerTBEvent[] = [
    event({ event: "click", click_id: "old_click" }),
    event({ event: "lead", event_id: "lead_1" }),
    event({
      event: "sale",
      event_id: "sale_1",
      invoice_id: "inv_1",
      saleAmount: 1000,
    }),
    event({
      event: "sale",
      event_id: "sale_2",
      invoice_id: "inv_2",
      saleAmount: 2000,
    }),
  ];

  it("selects every old event when the new customer is empty", () => {
    const selected = selectEventsToReingest({
      oldEvents,
      newEvents: [],
    });

    expect(selected.clickEvent?.click_id).toBe("old_click");
    expect(selected.leadEvent?.event_id).toBe("lead_1");
    expect(selected.saleEvents.map((sale) => sale.invoice_id)).toEqual([
      "inv_1",
      "inv_2",
    ]);
  });

  it("skips types already present and only copies missing sales", () => {
    const selected = selectEventsToReingest({
      oldEvents,
      newEvents: [
        event({ event: "click", click_id: "new_click" }),
        event({ event: "lead", event_id: "new_lead" }),
        event({ event: "sale", invoice_id: "inv_1", saleAmount: 1000 }),
      ],
    });

    expect(selected.clickEvent).toBeNull();
    expect(selected.leadEvent).toBeNull();
    expect(selected.saleEvents.map((sale) => sale.invoice_id)).toEqual([
      "inv_2",
    ]);
  });
});

describe("selectPaidReplacementEvents", () => {
  const newEvents: CustomerTBEvent[] = [
    event({ event: "lead", event_id: "new_lead" }),
    event({
      event: "sale",
      event_id: "new_sale_paid",
      invoice_id: "inv_paid",
      saleAmount: 5000,
    }),
    event({
      event: "sale",
      event_id: "new_sale_unpaid",
      invoice_id: "inv_unpaid",
      saleAmount: 1500,
    }),
  ];

  it("recreates paid lead and paid sales even when unpaid rows already moved", () => {
    const selected = selectPaidReplacementEvents({
      paidInvoiceIds: ["inv_paid"],
      hasPaidLead: true,
      newEvents,
      existingNewCommissions: [{ type: "sale", invoiceId: "inv_unpaid" }],
    });

    expect(selected.leadEvent?.event_id).toBe("new_lead");
    expect(selected.saleEvents.map((sale) => sale.invoice_id)).toEqual([
      "inv_paid",
    ]);
  });

  it("does not recreate a paid lead that already exists on the new customer", () => {
    const selected = selectPaidReplacementEvents({
      paidInvoiceIds: ["inv_paid"],
      hasPaidLead: true,
      newEvents,
      existingNewCommissions: [
        { type: "lead", invoiceId: null },
        { type: "sale", invoiceId: "inv_unpaid" },
      ],
    });

    expect(selected.leadEvent).toBeNull();
    expect(selected.saleEvents.map((sale) => sale.invoice_id)).toEqual([
      "inv_paid",
    ]);
  });

  it("skips paid sales that already have a replacement invoice", () => {
    const selected = selectPaidReplacementEvents({
      paidInvoiceIds: ["inv_paid"],
      hasPaidLead: false,
      newEvents,
      existingNewCommissions: [{ type: "sale", invoiceId: "inv_paid" }],
    });

    expect(selected.leadEvent).toBeNull();
    expect(selected.saleEvents).toEqual([]);
  });
});
