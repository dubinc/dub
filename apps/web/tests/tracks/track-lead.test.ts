import { TrackLeadResponse, TrackSaleResponse } from "@/lib/types";
import { randomCustomer } from "tests/utils/helpers";
import { E2E_CLICK_ID } from "tests/utils/resource";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

// Helper function to verify lead tracking response
const expectValidLeadResponse = (
  response: { status: number; data: TrackLeadResponse },
  customer: any,
) => {
  expect(response.status).toEqual(200);
  expect(response.data).toStrictEqual({
    clickId: E2E_CLICK_ID,
    customerName: customer.name,
    customerEmail: customer.email,
    customerAvatar: customer.avatar,
    click: {
      id: E2E_CLICK_ID,
    },
    customer,
  });
};

describe("POST /track/lead", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  const customer1 = randomCustomer();
  test("track a lead", async () => {
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: E2E_CLICK_ID,
        eventName: "Signup",
        externalId: customer1.externalId,
        customerName: customer1.name,
        customerEmail: customer1.email,
        customerAvatar: customer1.avatar,
      },
    });

    expectValidLeadResponse(response, customer1);
  });

  test("duplicate request with same externalId", async () => {
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: E2E_CLICK_ID,
        eventName: "Signup",
        externalId: customer1.externalId,
        customerName: customer1.name,
        customerEmail: customer1.email,
        customerAvatar: customer1.avatar,
      },
    });

    // should return the same response since it's idempotent
    expectValidLeadResponse(response, customer1);
  });

  test("track a lead with eventQuantity", async () => {
    const customer2 = randomCustomer();
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: E2E_CLICK_ID,
        eventName: "Start Trial",
        externalId: customer2.externalId,
        customerName: customer2.name,
        customerEmail: customer2.email,
        customerAvatar: customer2.avatar,
        eventQuantity: 2,
      },
    });

    expectValidLeadResponse(response, customer2);
  });

  test("track a lead with mode = 'wait' + track a sale right after", async () => {
    const customer3 = randomCustomer();
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: E2E_CLICK_ID,
        eventName: "Mode=Wait Signup",
        externalId: customer3.externalId,
        customerName: customer3.name,
        customerEmail: customer3.email,
        customerAvatar: customer3.avatar,
        mode: "wait",
      },
    });
    expectValidLeadResponse(response, customer3);

    const saleResponse = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        externalId: customer3.externalId,
        eventName: "Mode=Wait Purchase",
        amount: 500,
        paymentProcessor: "stripe",
      },
    });

    expect(saleResponse.status).toEqual(200);
  });
});
